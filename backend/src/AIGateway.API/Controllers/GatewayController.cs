using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using AIGateway.Application.DTOs;
using AIGateway.Application.Interfaces;
using AIGateway.Domain.Entities;
using AIGateway.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;
namespace AIGateway.API.Controllers;
[ApiController]
[Route("gateway")]
public class GatewayController : ControllerBase
{
    private readonly IAiProviderService _aiService;
    private readonly IUnitOfWork _uow;
    private readonly ILogger<GatewayController> _logger;
    public GatewayController(IAiProviderService aiService, IUnitOfWork uow, ILogger<GatewayController> logger)
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

    [HttpPost("chat/completions")]
    [AllowAnonymous]
    public async Task<IActionResult> Chat([FromBody] GatewayChatRequest request)
    {
        var (userId, apiKeyId) = ResolveCaller();
        if (User.Identity?.IsAuthenticated != true && userId == null)
            return Unauthorized(new { error = "Authentication required. Provide a valid JWT (Bearer token) or API key." });

        _logger.LogInformation("REQCAPTURE model={Model} stream={Stream} settings={Settings} toolChoice={ToolChoice} tools={Tools}",
            request.Model, request.Stream,
            request.Settings != null ? System.Text.Json.JsonSerializer.Serialize(request.Settings) : "null",
            request.ToolChoice != null ? System.Text.Json.JsonSerializer.Serialize(request.ToolChoice) : "null",
            request.Tools != null ? System.Text.Json.JsonSerializer.Serialize(request.Tools) : "null");

        var model = await _uow.Repository<AIModel>().Query()
            .Include(m => m.Provider)
            .OrderBy(m => m.Provider != null ? m.Provider.Priority : int.MaxValue)
            .FirstOrDefaultAsync(m => m.Provider != null && m.Provider.IsActive && (m.Name == request.Model || (m.ActualModelName != null && m.ActualModelName == request.Model) || (m.AlternativeModelName != null && m.AlternativeModelName == request.Model)));
        if (model == null)
            return NotFound(new { error = "Model not found or its provider is inactive" });

        if (apiKeyId.HasValue)
        {
            var key = await _uow.Repository<ApiKey>().Query().FirstOrDefaultAsync(k => k.Id == apiKeyId.Value);
            if (key is { RestrictToActiveModels: true } && model.Status != Domain.Enums.ModelStatus.Active)
                return StatusCode(403, new { error = $"This API key is restricted to active models. Model `{model.Name}` is not active." });
            if (key is { AllowedModelIds: { Length: > 0 } })
            {
                var allowed = key.AllowedModelIds.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
                if (!allowed.Contains(model.Id.ToString()))
                    return StatusCode(403, new { error = $"This API key is not allowed to use model `{model.Name}`." });
            }
        }

        var settings = request.Settings != null ? new ChatSettingsDto(
            request.Settings.Temperature, request.Settings.TopP, request.Settings.FrequencyPenalty, request.Settings.PresencePenalty,
            request.Settings.MaxTokens, request.Settings.StopSequence, request.Settings.JsonMode, request.Settings.EnableThinking) : null;

        var requestContent = System.Text.Json.JsonSerializer.Serialize(request.Messages);

        if (request.Stream)
        {
            Response.Headers["Content-Type"] = "text/event-stream";
            Response.Headers["Cache-Control"] = "no-cache";
            Response.Headers["Connection"] = "keep-alive";
            var streamId = $"chatcmpl-{Guid.NewGuid():N}";
            var streamCreated = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
            long pt = 0, ct = 0, tt = 0;
            var sw = System.Diagnostics.Stopwatch.StartNew();
            var aggregate = new System.Text.StringBuilder();
            try
            {
                await foreach (var chunk in _aiService.SendChatStreamAsync(model.Id, request.Messages, settings, request.Tools, request.ToolChoice))
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
                sw.Stop();
                await LogUsage(model, requestContent, pt, ct, tt, sw.ElapsedMilliseconds, aggregate.ToString(), true, null);
                return new EmptyResult();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Stream chat error model={Model}", request.Model);
                await LogUsage(model, requestContent, pt, ct, tt, sw.ElapsedMilliseconds, aggregate.ToString(), false, ex.Message);
                await Response.WriteAsync($"data: {System.Text.Json.JsonSerializer.Serialize(BuildErrorBody(ex))}\n\n");
                await Response.Body.FlushAsync();
                return new EmptyResult();
            }
        }

        try
        {
            var result = await _aiService.SendChatAsync(model.Id, request.Messages, settings, request.Tools, request.ToolChoice);
            await LogUsage(model, requestContent, result.PromptTokens, result.CompletionTokens, result.TotalTokens, result.LatencyMs, result.Content, true, null);
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
            await LogUsage(model, requestContent, 0, 0, 0, 0, "", false, ex.Message);
            var status = (int?)ex.StatusCode ?? 502;
            return StatusCode(status, BuildErrorBody(ex));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Chat error model={Model}", request.Model);
            await LogUsage(model, requestContent, 0, 0, 0, 0, "", false, ex.Message);
            return StatusCode(502, BuildErrorBody(ex));
        }
    }

    private static object BuildErrorBody(Exception ex)
    {
        return new
        {
            error = new
            {
                message = ex.Message,
                type = "invalid_request_error",
                param = (string?)null,
                code = ex is HttpRequestException hre && hre.StatusCode == System.Net.HttpStatusCode.RequestEntityTooLarge ? "payload_too_large" : (string?)null
            }
        };
    }

    private async Task LogUsage(AIModel model, string requestContent, long pt, long ct, long tt, long latencyMs, string responseContent, bool success, string? error)
    {
        try
        {
            decimal? cost = null;
            if (model.PricePerPromptToken.HasValue && model.PricePerCompletionToken.HasValue)
                cost = (model.PricePerPromptToken.Value * pt) + (model.PricePerCompletionToken.Value * ct);

            var (userId, apiKeyId) = ResolveCaller();

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
                IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
                RequestSize = System.Text.Encoding.UTF8.GetByteCount(requestContent ?? ""),
                ResponseSize = System.Text.Encoding.UTF8.GetByteCount(responseContent ?? ""),
                RequestContent = requestContent,
                ResponseContent = responseContent,
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

public class GatewayChatRequest
{
    public string Model { get; set; } = string.Empty;
    public List<ChatMessageDto> Messages { get; set; } = new();
    public bool Stream { get; set; }
    public ChatSettingsDto? Settings { get; set; }
    public List<ChatToolDto>? Tools { get; set; }
    public object? ToolChoice { get; set; }
}