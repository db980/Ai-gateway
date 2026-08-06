using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using AIGateway.Application.DTOs;
using AIGateway.Application.Interfaces;
using AIGateway.Domain.Interfaces;
using AIGateway.Domain.Entities;
using Microsoft.EntityFrameworkCore;
namespace AIGateway.API.Controllers;
[ApiController] [Route("api/[controller]")]
public class ChatController : ControllerBase
{
    private readonly IAiProviderService _aiService;
    private readonly IUnitOfWork _uow;
    private readonly ILogger<ChatController> _logger;
    public ChatController(IAiProviderService aiService, IUnitOfWork uow, ILogger<ChatController> logger)
    {
        _aiService = aiService;
        _uow = uow;
        _logger = logger;
    }

    private (Guid? userId, Guid? apiKeyId) ResolveCaller()
    {
        Guid? userId = null;
        Guid? apiKeyId = null;
        if (HttpContext.Items.TryGetValue("UserId", out var uidObj) && uidObj is Guid uid) userId = uid;
        if (HttpContext.Items.TryGetValue("ApiKeyId", out var akObj) && akObj is Guid ak) apiKeyId = ak;
        return (userId, apiKeyId);
    }

    [HttpPost]
    [AllowAnonymous]
    public async Task<IActionResult> Chat([FromBody] ChatRequestDto request)
    {
        var (userId, apiKeyId) = ResolveCaller();
        if (User.Identity?.IsAuthenticated != true && userId == null)
            return Unauthorized(new { error = "Authentication required. Provide a valid JWT (Bearer token) or API key." });

        var model = await _uow.Repository<AIModel>().Query()
            .Include(m => m.Provider)
            .FirstOrDefaultAsync(m => m.Name == request.Model || (m.ActualModelName != null && m.ActualModelName == request.Model) || (m.AlternativeModelName != null && m.AlternativeModelName == request.Model));
        if (model == null) return NotFound(new { error = "Model not found" });

        if (apiKeyId.HasValue)
        {
            var key = await _uow.Repository<ApiKey>().Query().FirstOrDefaultAsync(k => k.Id == apiKeyId.Value);
            if (key is { RestrictToActiveModels: true } && model.Status != AIGateway.Domain.Enums.ModelStatus.Active)
                return StatusCode(403, new { error = $"This API key is restricted to active models. Model `{model.Name}` is not active." });
            if (key is { AllowedModelIds: { Length: > 0 } })
            {
                var allowed = key.AllowedModelIds.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
                if (!allowed.Contains(model.Id.ToString()))
                    return StatusCode(403, new { error = $"This API key is not allowed to use model `{model.Name}`." });
            }
        }

        var ip = HttpContext.Connection.RemoteIpAddress?.ToString();

        if (request.Stream)
        {
            Response.Headers["Content-Type"] = "text/event-stream";
            Response.Headers["Cache-Control"] = "no-cache";
            Response.Headers["Connection"] = "keep-alive";
            var streamId = $"chatcmpl-{Guid.NewGuid():N}";
            var streamCreated = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
            long pt = 0, ct = 0, tt = 0;
            var swLatency = System.Diagnostics.Stopwatch.StartNew();
            var aggregate = new System.Text.StringBuilder();
            try
            {
                await foreach (var chunk in _aiService.SendChatStreamAsync(model.Id, request.Messages, request.Settings, request.Tools, request.ToolChoice))
                {
                    aggregate.Append(chunk.Content);
                    pt += chunk.PromptTokens;
                    ct += chunk.CompletionTokens;
                    tt += chunk.TotalTokens;
                    var toolCalls = chunk.ToolCallDeltas?.Select(t => new { index = t.Index, id = t.Id, function = new { name = t.Name, arguments = t.Arguments } }).ToArray();
                    await Response.WriteAsync($"data: {System.Text.Json.JsonSerializer.Serialize(new { id = streamId, @object = "chat.completion.chunk", created = streamCreated, model = request.Model, choices = new[] { new { index = 0, delta = new { role = "assistant", content = chunk.Content, reasoning_content = chunk.Reasoning, tool_calls = toolCalls }, finish_reason = chunk.FinishReason } } })}\n\n");
                    await Response.Body.FlushAsync();
                }
                await Response.WriteAsync("data: [DONE]\n\n");
                await Response.Body.FlushAsync();
                swLatency.Stop();
                await LogUsage(model, userId, apiKeyId, ip, pt, ct, tt, swLatency.ElapsedMilliseconds, aggregate.ToString(), true, null);
                return new EmptyResult();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Stream chat error model={Model}", request.Model);
                await LogUsage(model, userId, apiKeyId, ip, pt, ct, tt, swLatency.ElapsedMilliseconds, aggregate.ToString(), false, ex.Message);
                await Response.WriteAsync($"data: {System.Text.Json.JsonSerializer.Serialize(new { error = new { message = ex.Message, type = "invalid_request_error", param = (string?)null, code = (string?)null } })}\n\n");
                await Response.WriteAsync("data: [DONE]\n\n");
                await Response.Body.FlushAsync();
                return new EmptyResult();
            }
        }

        try
        {
            var result = await _aiService.SendChatAsync(model.Id, request.Messages, request.Settings, request.Tools, request.ToolChoice);
            await LogUsage(model, userId, apiKeyId, ip, result.PromptTokens, result.CompletionTokens, result.TotalTokens, result.LatencyMs, result.Content, true, null);
            var completionId = $"chatcmpl-{Guid.NewGuid():N}";
            var created = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
            var finishReason = result.FinishReason ?? (result.ToolCalls is { Count: > 0 } ? "tool_calls" : "stop");
            return Ok(new
            {
                id = completionId,
                @object = "chat.completion",
                created,
                model = request.Model,
                choices = new[]
                {
                    new
                    {
                        index = 0,
                        message = new { role = "assistant", content = result.Content, reasoning_content = result.Reasoning, tool_calls = result.ToolCalls },
                        finish_reason = finishReason
                    }
                },
                usage = new
                {
                    prompt_tokens = result.PromptTokens,
                    completion_tokens = result.CompletionTokens,
                    total_tokens = result.TotalTokens
                }
            });
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "Chat error model={Model}", request.Model);
            await LogUsage(model, userId, apiKeyId, ip, 0, 0, 0, 0, "", false, ex.Message);
            var status = (int?)ex.StatusCode ?? 502;
            return StatusCode(status, new { error = new { message = ex.Message, type = "invalid_request_error", param = (string?)null, code = (string?)null } });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Chat error model={Model}", request.Model);
            await LogUsage(model, userId, apiKeyId, ip, 0, 0, 0, 0, "", false, ex.Message);
            return StatusCode(502, new { error = new { message = $"Provider error: {ex.Message}", type = "invalid_request_error", param = (string?)null, code = (string?)null } });
        }
    }

    private async Task LogUsage(AIModel model, Guid? userId, Guid? apiKeyId, string? ip, long pt, long ct, long tt, long latencyMs, string content, bool success, string? error)
    {
        try
        {
            decimal? cost = null;
            if (model.PricePerPromptToken.HasValue && model.PricePerCompletionToken.HasValue)
                cost = (model.PricePerPromptToken.Value * pt) + (model.PricePerCompletionToken.Value * ct);

            if (userId == null)
            {
                var sysUser = await _uow.Repository<User>().Query().FirstOrDefaultAsync(u => u.Email == "admin@aigw.com");
                if (sysUser != null) userId = sysUser.Id;
                if (userId == null) return;
            }

            var rec = new UsageRecord
            {
                Id = Guid.NewGuid(),
                UserId = userId.Value,
                ApiKeyId = apiKeyId,
                ProviderId = model.ProviderId,
                ModelId = model.Id,
                ModelName = model.Name,
                ProviderName = model.Provider?.Name ?? "",
                PromptTokens = pt,
                CompletionTokens = ct,
                TotalTokens = tt,
                Cost = cost,
                LatencyMs = latencyMs,
                IsSuccess = success,
                ErrorMessage = error,
                IpAddress = ip,
                RequestSize = System.Text.Encoding.UTF8.GetByteCount(content ?? ""),
                ResponseSize = 0,
                CreatedAt = DateTime.UtcNow,
            };
            await _uow.Repository<UsageRecord>().AddAsync(rec);
            await _uow.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to persist usage record");
        }
    }
}