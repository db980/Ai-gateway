namespace AIGateway.Application.Interfaces;
public interface IModelRateLimiter
{
    Task<(bool Allowed, string? Reason, int RetryAfterSeconds)> TryAcquireAsync(Guid modelId, long estimatedTokens, CancellationToken ct);
    void Release(Guid modelId);
    void ResetForModel(Guid modelId);
}
