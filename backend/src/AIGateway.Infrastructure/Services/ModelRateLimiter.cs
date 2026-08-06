using System.Collections.Concurrent;
using AIGateway.Application.Interfaces;
using AIGateway.Domain.Entities;
using AIGateway.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using System;

namespace AIGateway.Infrastructure.Services;
public class ModelRateLimiter : IModelRateLimiter
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<ModelRateLimiter> _logger;
    private readonly ConcurrentDictionary<Guid, SemaphoreSlim> _semaphores = new();
    private readonly ConcurrentDictionary<Guid, LinkedList<DateTime>> _rpmWindows = new();
    private readonly ConcurrentDictionary<Guid, TpdTracker> _tpdTrackers = new();
    private readonly SemaphoreSlim _stateLock = new(1, 1);

    public ModelRateLimiter(IServiceScopeFactory scopeFactory, ILogger<ModelRateLimiter> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    private sealed class TpdTracker
    {
        public string DayKey { get; set; } = DateTime.UtcNow.ToString("yyyyMMdd");
        public long TokensUsed { get; set; }
    }

    public async Task<(bool Allowed, string? Reason, int RetryAfterSeconds)> TryAcquireAsync(Guid modelId, long estimatedTokens, CancellationToken ct)
    {
        AIModel? model;
        using (var scope = _scopeFactory.CreateScope())
        {
            var uow = scope.ServiceProvider.GetRequiredService<IUnitOfWork>();
            model = await uow.Repository<AIModel>().Query().FirstOrDefaultAsync(m => m.Id == modelId, ct);
        }
        if (model == null) return (false, "Model not found", 0);

        var concurrency = model.MaxConcurrency is > 0 ? model.MaxConcurrency.Value : int.MaxValue;
        if (concurrency < int.MaxValue)
        {
            var semaphore = _semaphores.GetOrAdd(modelId, _ => new SemaphoreSlim(concurrency, concurrency));
            if (!await semaphore.WaitAsync(TimeSpan.FromSeconds(2), ct))
                return (false, $"Concurrency limit reached for model '{model.Name}' (max {concurrency})", 2);
        }

        try
        {
            if (model.RpmLimit is > 0)
            {
                var window = _rpmWindows.GetOrAdd(modelId, _ => new LinkedList<DateTime>());
                lock (window)
                {
                    var now = DateTime.UtcNow;
                    while (window.Count > 0 && (now - window.First!.Value).TotalSeconds > 60)
                        window.RemoveFirst();
                    if (window.Count >= model.RpmLimit.Value)
                    {
                        var oldest = window.First!.Value;
                        var retry = Math.Max(1, 60 - (int)(now - oldest).TotalSeconds);
                        return (false, $"Rate limit exceeded for model '{model.Name}': max {model.RpmLimit.Value} requests/min. Retry in {retry}s.", retry);
                    }
                    window.AddLast(now);
                }
            }

            if (model.TpdLimit is > 0)
            {
                var tracker = _tpdTrackers.GetOrAdd(modelId, _ => new TpdTracker());
                await _stateLock.WaitAsync(ct);
                try
                {
                    var today = DateTime.UtcNow.ToString("yyyyMMdd");
                    if (tracker.DayKey != today)
                    {
                        tracker.DayKey = today;
                        tracker.TokensUsed = 0;
                    }
                    if (tracker.TokensUsed + estimatedTokens > model.TpdLimit.Value)
                        return (false, $"Daily token limit reached for model '{model.Name}': max {model.TpdLimit.Value} tokens/day.", 0);
                    tracker.TokensUsed += estimatedTokens;
                }
                finally { _stateLock.Release(); }
            }

            return (true, null, 0);
        }
        catch
        {
            Release(modelId);
            throw;
        }
    }

    public void Release(Guid modelId)
    {
        if (_semaphores.TryGetValue(modelId, out var semaphore))
        {
            try { semaphore.Release(); } catch (SemaphoreFullException) { }
        }
    }

    public void ResetForModel(Guid modelId)
    {
        _semaphores.TryRemove(modelId, out var semaphore);
        _rpmWindows.TryRemove(modelId, out _);
        _tpdTrackers.TryRemove(modelId, out _);
        semaphore?.Dispose();
    }
}
