using System.Diagnostics;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using AIGateway.Application.DTOs;
using Microsoft.Extensions.Logging;
using AIGateway.Application.Interfaces;
using AIGateway.Domain.Entities;
using AIGateway.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;
namespace AIGateway.Infrastructure.Services;
public class AiProviderService : IAiProviderService
{
    private readonly IUnitOfWork _uow;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<AiProviderService> _logger;
    private readonly IModelRateLimiter _rateLimiter;
    private const int MaxRetries = 3;
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private const long DefaultTpmLimit = 8000;
    private const long TpmOutputReserve = 1024;
    private const int DefaultMaxTokens = 4096;
    private const int TpmTrimRetries = 3;
    public AiProviderService(IUnitOfWork uow, IHttpClientFactory httpClientFactory, ILogger<AiProviderService> logger, IModelRateLimiter rateLimiter)
    {
        _uow = uow;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
        _rateLimiter = rateLimiter;
    }

    private static string ExtractError(string body)
    {
        try
        {
            using var doc = JsonDocument.Parse(body);
            if (doc.RootElement.TryGetProperty("error", out var err))
                return err.TryGetProperty("message", out var msg) ? msg.GetString() ?? "" : err.GetRawText();
        }
        catch { }
        return body.Length > 200 ? body[..200] : body;
    }

    private static int NormalizeMaxTokens(int value) => value < 1 ? DefaultMaxTokens : value;

    private static string ExtractReasoning(JsonElement delta)
    {
        if (delta.TryGetProperty("reasoning_content", out var rc) && rc.ValueKind == JsonValueKind.String)
            return rc.GetString() ?? "";
        if (delta.TryGetProperty("reasoning", out var r) && r.ValueKind == JsonValueKind.String)
            return r.GetString() ?? "";
        if (delta.TryGetProperty("thinking", out var t) && t.ValueKind == JsonValueKind.String)
            return t.GetString() ?? "";
        if (delta.TryGetProperty("thinking_content", out var tc) && tc.ValueKind == JsonValueKind.String)
            return tc.GetString() ?? "";
        return "";
    }

    private static (string Content, string Reasoning) SplitThinkTags(string content)
    {
        if (string.IsNullOrEmpty(content) || content.IndexOf("<think>", StringComparison.OrdinalIgnoreCase) < 0)
            return (content, "");
        var sbContent = new StringBuilder();
        var sbReasoning = new StringBuilder();
        int pos = 0;
        while (pos < content.Length)
        {
            var open = content.IndexOf("<think>", pos, StringComparison.OrdinalIgnoreCase);
            if (open < 0) { sbContent.Append(content[pos..]); break; }
            var close = content.IndexOf("</think>", open + 7, StringComparison.OrdinalIgnoreCase);
            if (close < 0) { sbContent.Append(content[pos..]); break; }
            sbContent.Append(content[pos..open]);
            sbReasoning.Append(content, open + 7, close - open - 7);
            pos = close + 8;
        }
        return (sbContent.ToString(), sbReasoning.ToString());
    }

    private static bool IsTpmLimitError(HttpRequestException ex)
    {
        if (ex.StatusCode == System.Net.HttpStatusCode.RequestEntityTooLarge) return true;
        return ex.StatusCode == System.Net.HttpStatusCode.TooManyRequests &&
            (ex.Message.Contains("tokens per minute", StringComparison.OrdinalIgnoreCase) ||
             ex.Message.Contains("TPM", StringComparison.OrdinalIgnoreCase) ||
             ex.Message.Contains("Request too large", StringComparison.OrdinalIgnoreCase));
    }

    private static bool IsHardQuotaError(string detail)
    {
        return detail.Contains("tokens per day", StringComparison.OrdinalIgnoreCase) ||
               detail.Contains("TPD", StringComparison.OrdinalIgnoreCase) ||
               detail.Contains("Rate limit reached", StringComparison.OrdinalIgnoreCase) ||
               detail.Contains("quota", StringComparison.OrdinalIgnoreCase) ||
               detail.Contains("billing", StringComparison.OrdinalIgnoreCase);
    }

    private async Task<HttpResponseMessage> SendWithRetryAsync(HttpClient client, Func<HttpRequestMessage> requestFactory, HttpCompletionOption completionOption = HttpCompletionOption.ResponseContentRead, int maxRetries = MaxRetries)
    {
        for (int attempt = 0; attempt <= maxRetries; attempt++)
        {
            if (attempt > 0)
            {
                var delay = TimeSpan.FromMilliseconds(Math.Pow(2, attempt) * 1000);
                _logger.LogWarning("Provider 429, retrying in {Delay}s (attempt {Attempt}/{MaxRetries})", delay.TotalSeconds, attempt, maxRetries);
                await Task.Delay(delay);
            }

            using var request = requestFactory();
            var response = await client.SendAsync(request, completionOption);

            if ((int)response.StatusCode == 429)
            {
                var body = await response.Content.ReadAsStringAsync();
                var detail = ExtractError(body);
                if (IsHardQuotaError(detail))
                    throw new HttpRequestException(detail, null, response.StatusCode);
                if (detail.Contains("tokens per minute", StringComparison.OrdinalIgnoreCase) ||
                    detail.Contains("TPM", StringComparison.OrdinalIgnoreCase) ||
                    detail.Contains("Request too large", StringComparison.OrdinalIgnoreCase))
                    throw new HttpRequestException(detail, null, response.StatusCode);

                if (attempt < maxRetries)
                {
                    var retryAfter = response.Headers.RetryAfter?.Delta;
                    if (retryAfter.HasValue)
                        await Task.Delay(retryAfter.Value);
                    continue;
                }
            }

            if (!response.IsSuccessStatusCode)
            {
                var body = await response.Content.ReadAsStringAsync();
                var detail = ExtractError(body);
                var message = string.IsNullOrWhiteSpace(detail)
                    ? $"Provider returned {(int)response.StatusCode} ({response.ReasonPhrase})"
                    : detail;
                throw new HttpRequestException(message, null, response.StatusCode);
            }

            return response;
        }

        return null!;
    }

    private async Task<AIModel> LoadModelAsync(Guid modelId)
    {
        var model = await _uow.Repository<AIModel>().Query()
            .Include(m => m.Provider)
            .ThenInclude(p => p.ApiKeys)
            .FirstOrDefaultAsync(m => m.Id == modelId);
        if (model == null) throw new KeyNotFoundException("Model not found");
        return model;
    }

    public async Task<ChatCompletionResult> SendChatAsync(Guid modelId, List<ChatMessageDto> messages, ChatSettingsDto? settings = null, List<ChatToolDto>? tools = null, object? toolChoice = null)
    {
        var model = await LoadModelAsync(modelId);
        var sw = Stopwatch.StartNew();

        var estimatedTokens = EstimateTokens(messages) + EstimateToolsTokens(tools);
        var (allowed, reason, retryAfter) = await _rateLimiter.TryAcquireAsync(modelId, estimatedTokens, CancellationToken.None);
        if (!allowed)
        {
            _logger.LogWarning("Rate limit for model {Model}: {Reason}", model.Name, reason);
            throw new HttpRequestException($"{reason}", null, System.Net.HttpStatusCode.TooManyRequests);
        }
        try
        {
        var provider = model.Provider!;

        if (provider.Type == "CustomRESTAPI")
        {
            var customResult = await SendCustomRestAsync(provider, model, messages, settings, stream: false);
            sw.Stop();
            customResult.LatencyMs = sw.ElapsedMilliseconds;
            return customResult;
        }

        var client = _httpClientFactory.CreateClient();
        client.Timeout = TimeSpan.FromSeconds(provider.Timeout ?? 60);
        ApplyAuth(client, provider);

        var baseUrl = provider.BaseUrl.TrimEnd('/');
        var epPath = provider.ChatEndpointPath ?? "";
        var fullUrl = string.IsNullOrEmpty(epPath) ? baseUrl : $"{baseUrl}/{epPath}";

        var (currentMessages, currentSettings, currentTools) = PrepareForTpm(messages, settings, tools, model.TpmLimit is > 0 ? model.TpmLimit.Value : 0);
        long tpmLimit = model.TpmLimit is > 0 ? model.TpmLimit.Value : DefaultTpmLimit;
        int trimAttempts = 0;

        while (true)
        {
            var body = BuildOpenAiBody(model, currentMessages, currentSettings, stream: false, currentTools, toolChoice);
            var serialized = JsonSerializer.Serialize(body, JsonOptions);
            try
            {
                var response = await SendWithRetryAsync(client, () =>
                {
                    var r = new HttpRequestMessage(HttpMethod.Post, fullUrl)
                    {
                        Content = new StringContent(serialized, Encoding.UTF8, "application/json")
                    };
                    ApplyExtraHeaders(r, provider);
                    return r;
                });
                var json = await response.Content.ReadAsStringAsync();
                sw.Stop();
                return ParseOpenAiResponse(json, sw.ElapsedMilliseconds);
            }
            catch (HttpRequestException ex) when (IsTpmLimitError(ex))
            {
                var trimmed = TrimForTpm(ex.Message, currentMessages, currentSettings, currentTools, ref tpmLimit);
                if (trimmed == null || trimAttempts++ >= TpmTrimRetries)
                    throw;
                currentMessages = trimmed.Value.Messages;
                currentSettings = trimmed.Value.Settings;
                currentTools = trimmed.Value.Tools;
            }
        }
        }
        finally
        {
            _rateLimiter.Release(modelId);
        }
    }

    public async IAsyncEnumerable<ChatCompletionResult> SendChatStreamAsync(Guid modelId, List<ChatMessageDto> messages, ChatSettingsDto? settings = null, List<ChatToolDto>? tools = null, object? toolChoice = null)
    {
        var model = await LoadModelAsync(modelId);
        var sw = Stopwatch.StartNew();
        var provider = model.Provider!;

        var estimatedTokens = EstimateTokens(messages) + EstimateToolsTokens(tools);
        var (allowed, reason, retryAfter) = await _rateLimiter.TryAcquireAsync(modelId, estimatedTokens, CancellationToken.None);
        if (!allowed)
        {
            _logger.LogWarning("Rate limit for model {Model}: {Reason}", model.Name, reason);
            throw new HttpRequestException($"{reason}", null, System.Net.HttpStatusCode.TooManyRequests);
        }

        try
        {

        if (provider.Type == "CustomRESTAPI")
        {
            await foreach (var chunk in SendCustomRestStreamAsync(provider, model, messages, settings))
            {
                sw.Stop();
                chunk.LatencyMs = sw.ElapsedMilliseconds;
                yield return chunk;
            }
            yield break;
        }

        var client = _httpClientFactory.CreateClient();
        client.Timeout = TimeSpan.FromSeconds(provider.Timeout ?? 60);
        ApplyAuth(client, provider);

        var baseUrl = provider.BaseUrl.TrimEnd('/');
        var epPath = provider.ChatEndpointPath ?? "";
        var fullUrl = string.IsNullOrEmpty(epPath) ? baseUrl : $"{baseUrl}/{epPath}";

        var (currentMessages, currentSettings, currentTools) = PrepareForTpm(messages, settings, tools, model.TpmLimit is > 0 ? model.TpmLimit.Value : 0);
        long tpmLimit = model.TpmLimit is > 0 ? model.TpmLimit.Value : DefaultTpmLimit;
        int trimAttempts = 0;
        HttpResponseMessage response;
        while (true)
        {
            var body = BuildOpenAiBody(model, currentMessages, currentSettings, stream: true, currentTools, toolChoice);
            var serialized = JsonSerializer.Serialize(body, JsonOptions);
            _logger.LogInformation("OUTBOUND {Serialized}", serialized);
            try
            {
                response = await SendWithRetryAsync(client, () =>
                {
                    var r = new HttpRequestMessage(HttpMethod.Post, fullUrl)
                    {
                        Content = new StringContent(serialized, Encoding.UTF8, "application/json")
                    };
                    r.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("text/event-stream"));
                    ApplyExtraHeaders(r, provider);
                    return r;
                }, HttpCompletionOption.ResponseHeadersRead);
                break;
            }
            catch (HttpRequestException ex) when (IsTpmLimitError(ex))
            {
                var trimmed = TrimForTpm(ex.Message, currentMessages, currentSettings, currentTools, ref tpmLimit);
                if (trimmed == null || trimAttempts++ >= TpmTrimRetries)
                    throw;
                currentMessages = trimmed.Value.Messages;
                currentSettings = trimmed.Value.Settings;
                currentTools = trimmed.Value.Tools;
            }
        }
        using var stream = await response.Content.ReadAsStreamAsync();
        using var reader = new StreamReader(stream);
        var aggregate = new ChatCompletionResult();
        var thinkPending = "";
        var inThink = false;
        while (!reader.EndOfStream)
        {
            var line = await reader.ReadLineAsync();
            if (string.IsNullOrEmpty(line)) continue;
            if (line.StartsWith("data: [DONE]")) break;
            if (!line.StartsWith("data: ")) continue;
            var dataJson = line[6..];
            using var doc = JsonDocument.Parse(dataJson);
            var root = doc.RootElement;
            if (root.TryGetProperty("usage", out var usage))
            {
                aggregate.PromptTokens = usage.TryGetProperty("prompt_tokens", out var pt) ? pt.GetInt64() : 0;
                aggregate.CompletionTokens = usage.TryGetProperty("completion_tokens", out var ct) ? ct.GetInt64() : 0;
                aggregate.TotalTokens = usage.TryGetProperty("total_tokens", out var tt) ? tt.GetInt64() : 0;
            }
            if (!root.TryGetProperty("choices", out var choices) || choices.GetArrayLength() == 0) continue;
            var choice = choices[0];
            string? finishReason = null;
            if (choice.TryGetProperty("finish_reason", out var fr) && fr.ValueKind == JsonValueKind.String)
            {
                finishReason = fr.GetString();
                if (!string.IsNullOrEmpty(finishReason))
                {
                    aggregate.FinishReason = finishReason;
                    yield return new ChatCompletionResult { FinishReason = finishReason };
                }
            }
            if (!choice.TryGetProperty("delta", out var delta)) continue;
            if (delta.TryGetProperty("content", out var contentEl))
            {
                var text = contentEl.GetString() ?? "";
                if (text.Length > 0)
                {
                    thinkPending += text;
                    while (thinkPending.Length > 0)
                    {
                        if (inThink)
                        {
                            var closeIdx = thinkPending.IndexOf("</think>", StringComparison.OrdinalIgnoreCase);
                            if (closeIdx >= 0)
                            {
                                var reasoning = thinkPending[..closeIdx];
                                thinkPending = thinkPending[(closeIdx + 8)..];
                                if (reasoning.Length > 0)
                                {
                                    aggregate.Reasoning += reasoning;
                                    yield return new ChatCompletionResult { Reasoning = reasoning };
                                }
                                inThink = false;
                            }
                            else
                            {
                                var hold = Math.Min(8, thinkPending.Length);
                                var emit = thinkPending[..^hold];
                                thinkPending = thinkPending[^hold..];
                                if (emit.Length > 0)
                                {
                                    aggregate.Reasoning += emit;
                                    yield return new ChatCompletionResult { Reasoning = emit };
                                }
                                break;
                            }
                        }
                        else
                        {
                            var openIdx = thinkPending.IndexOf("<think>", StringComparison.OrdinalIgnoreCase);
                            if (openIdx >= 0)
                            {
                                var contentText = thinkPending[..openIdx];
                                thinkPending = thinkPending[(openIdx + 7)..];
                                if (contentText.Length > 0)
                                {
                                    aggregate.Content += contentText;
                                    sw.Stop();
                                    yield return new ChatCompletionResult { Content = contentText, LatencyMs = sw.ElapsedMilliseconds };
                                }
                                inThink = true;
                            }
                            else
                            {
                                var hold = Math.Min(7, thinkPending.Length);
                                var emit = thinkPending[..^hold];
                                thinkPending = thinkPending[^hold..];
                                if (emit.Length > 0)
                                {
                                    aggregate.Content += emit;
                                    sw.Stop();
                                    yield return new ChatCompletionResult { Content = emit, LatencyMs = sw.ElapsedMilliseconds };
                                }
                                break;
                            }
                        }
                    }
                }
            }
            var reasoningText = ExtractReasoning(delta);
            if (reasoningText.Length > 0)
            {
                aggregate.Reasoning += reasoningText;
                yield return new ChatCompletionResult { Reasoning = reasoningText };
            }
            if (delta.TryGetProperty("tool_calls", out var tc) && tc.GetArrayLength() > 0)
            {
                foreach (var t in tc.EnumerateArray())
                {
                    int index = t.TryGetProperty("index", out var idx) ? idx.GetInt32() : 0;
                    string? id = null, fname = null, fargs = null;
                    if (t.TryGetProperty("id", out var idEl)) id = idEl.GetString();
                    if (t.TryGetProperty("function", out var fn))
                    {
                        if (fn.TryGetProperty("name", out var n)) fname = n.GetString();
                        if (fn.TryGetProperty("arguments", out var a)) fargs = a.GetString();
                    }
                    var toolChunk = new ChatStreamToolCall(index, id, fname, fargs);
                    aggregate.ToolCallDeltas ??= new List<ChatStreamToolCall>();
                    aggregate.ToolCallDeltas.Add(toolChunk);
                    yield return new ChatCompletionResult { ToolCallDeltas = new List<ChatStreamToolCall> { toolChunk } };
                }
            }
        }
        if (thinkPending.Length > 0)
        {
            if (inThink)
            {
                aggregate.Reasoning += thinkPending;
                yield return new ChatCompletionResult { Reasoning = thinkPending };
            }
            else
            {
                aggregate.Content += thinkPending;
                sw.Stop();
                yield return new ChatCompletionResult { Content = thinkPending, LatencyMs = sw.ElapsedMilliseconds };
            }
        }
        if (aggregate.PromptTokens == 0 && aggregate.CompletionTokens == 0)
        {
            aggregate.PromptTokens = EstimateTokens(messages);
            aggregate.CompletionTokens = EstimateTokens(new List<ChatMessageDto> { new("assistant", aggregate.Content) });
            aggregate.TotalTokens = aggregate.PromptTokens + aggregate.CompletionTokens;
        }
        }
        finally
        {
            _rateLimiter.Release(modelId);
        }
    }

    private static Dictionary<string, object?> BuildOpenAiBody(AIModel model, List<ChatMessageDto> messages, ChatSettingsDto? settings, bool stream, List<ChatToolDto>? tools = null, object? toolChoice = null)
    {
        var body = new Dictionary<string, object?>
        {
            ["model"] = ModelKey(model),
            ["messages"] = messages.Select(m => BuildMessage(m)).ToArray(),
            ["temperature"] = settings?.Temperature ?? 0.7,
            ["max_tokens"] = NormalizeMaxTokens(settings?.MaxTokens ?? Math.Min(model.MaxTokens ?? 4096, 4096)),
            ["stream"] = stream,
        };
        if (settings?.TopP.HasValue == true) body["top_p"] = settings.TopP;
        if (settings?.FrequencyPenalty.HasValue == true) body["frequency_penalty"] = settings.FrequencyPenalty;
        if (settings?.PresencePenalty.HasValue == true) body["presence_penalty"] = settings.PresencePenalty;
        if (settings?.StopSequence != null) body["stop"] = settings.StopSequence;
        if (tools is { Count: > 0 })
            body["tools"] = tools.Select(t => new
            {
                type = t.Type,
                function = t.Function == null ? null : new
                {
                    name = t.Function.Name,
                    description = t.Function.Description,
                    parameters = t.Function.Parameters
                }
            }).ToArray();
        if (toolChoice != null) body["tool_choice"] = toolChoice;
        if (settings?.EnableThinking == true)
        {
            body["enable_thinking"] = true;
            body["chat_template_kwargs"] = new Dictionary<string, object?> { ["enable_thinking"] = true };
        }
        return body;
    }

    private static object BuildMessage(ChatMessageDto m)
    {
        if (m.Role == "tool" && m.ToolCallId != null)
            return new { role = m.Role, content = m.Content, tool_call_id = m.ToolCallId };
        if (m.Role == "assistant" && m.ToolCalls is { Count: > 0 })
            return new { role = m.Role, content = m.Content, tool_calls = m.ToolCalls };
        if (m.Name != null)
            return new { role = m.Role, content = m.Content, name = m.Name };
        return new { role = m.Role, content = m.Content };
    }

    private static ChatCompletionResult ParseOpenAiResponse(string json, long latencyMs)
    {
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;
        var content = "";
        var reasoning = "";
        string? finishReason = null;
        var toolCalls = new List<ChatToolCallDto>();
        if (root.TryGetProperty("choices", out var choices) && choices.GetArrayLength() > 0)
        {
            var choice = choices[0];
            if (choice.TryGetProperty("finish_reason", out var fr) && fr.ValueKind == JsonValueKind.String)
                finishReason = fr.GetString();
            if (choice.TryGetProperty("message", out var msg))
            {
                if (msg.TryGetProperty("content", out var c))
                    content = c.GetString() ?? "";
                reasoning = ExtractReasoning(msg);
                var split = SplitThinkTags(content);
                content = split.Content;
                if (split.Reasoning.Length > 0)
                    reasoning = reasoning.Length > 0 ? reasoning + "\n" + split.Reasoning : split.Reasoning;
                if (msg.TryGetProperty("tool_calls", out var tcs) && tcs.GetArrayLength() > 0)
                {
                    foreach (var tc in tcs.EnumerateArray())
                    {
                        string? id = null, fname = null, fargs = null;
                        if (tc.TryGetProperty("id", out var idEl)) id = idEl.GetString();
                        if (tc.TryGetProperty("function", out var fn))
                        {
                            if (fn.TryGetProperty("name", out var n)) fname = n.GetString();
                            if (fn.TryGetProperty("arguments", out var a)) fargs = a.GetString();
                        }
                        toolCalls.Add(new ChatToolCallDto(id ?? "", "function", new ChatToolCallFunctionDto(fname ?? "", fargs)));
                    }
                }
            }
        }
        long pt = 0, ct = 0, tt = 0;
        if (root.TryGetProperty("usage", out var usage))
        {
            pt = usage.TryGetProperty("prompt_tokens", out var p) ? p.GetInt64() : 0;
            ct = usage.TryGetProperty("completion_tokens", out var cm) ? cm.GetInt64() : 0;
            tt = usage.TryGetProperty("total_tokens", out var tm) ? tm.GetInt64() : 0;
        }
        return new ChatCompletionResult
        {
            Content = content,
            Reasoning = reasoning,
            PromptTokens = pt,
            CompletionTokens = ct,
            TotalTokens = tt,
            LatencyMs = latencyMs,
            FinishReason = finishReason,
            ToolCalls = toolCalls.Count > 0 ? toolCalls : null,
        };
    }

    private static void ApplyAuth(HttpClient client, Provider provider)
    {
        var authType = (provider.AuthType ?? "Bearer").Trim();
        var apiKey = provider.ApiKeys?.FirstOrDefault(k => k.IsActive)?.KeyValue ?? provider.ApiKey;
        if (authType.Equals("None", StringComparison.OrdinalIgnoreCase) || string.IsNullOrEmpty(apiKey))
            return;
        if (authType.Equals("Bearer", StringComparison.OrdinalIgnoreCase))
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
        else if (authType.Equals("ApiKey", StringComparison.OrdinalIgnoreCase))
            client.DefaultRequestHeaders.Add("api-key", apiKey);
        else if (authType.Equals("x-api-key", StringComparison.OrdinalIgnoreCase))
            client.DefaultRequestHeaders.Add("x-api-key", apiKey);
        else
            client.DefaultRequestHeaders.Add(authType, apiKey);
    }

    private static void ApplyExtraHeaders(HttpRequestMessage req, Provider provider)
    {
        if (string.IsNullOrWhiteSpace(provider.Headers)) return;
        try
        {
            using var doc = JsonDocument.Parse(provider.Headers);
            foreach (var prop in doc.RootElement.EnumerateObject())
            {
                if (prop.Value.ValueKind == JsonValueKind.String)
                    req.Headers.TryAddWithoutValidation(prop.Name, prop.Value.GetString());
            }
        }
        catch (JsonException ex)
        {
            throw new InvalidOperationException($"Invalid Headers JSON on provider '{provider.Name}': {ex.Message}");
        }
    }

    public async Task<TestResult> TestModelAsync(Guid modelId)
    {
        var sw = Stopwatch.StartNew();
        try
        {
            var model = await LoadModelAsync(modelId);
            var provider = model.Provider!;
            var testMessages = new List<ChatMessageDto> { new("user", "Hi") };
            var response = "";
            long pt = 0, ct = 0, tt = 0;

            if (provider.Type == "CustomRESTAPI")
            {
                var result = await SendCustomRestAsync(provider, model, testMessages, null, stream: false);
                response = result.Content;
                pt = result.PromptTokens;
                ct = result.CompletionTokens;
                tt = result.TotalTokens;
            }
            else
            {
                var client = _httpClientFactory.CreateClient();
                client.Timeout = TimeSpan.FromSeconds(10);
                ApplyAuth(client, provider);

                var baseUrl = provider.BaseUrl.TrimEnd('/');
                var epPath = provider.ChatEndpointPath ?? "";
                var fullUrl = string.IsNullOrEmpty(epPath) ? baseUrl : $"{baseUrl}/{epPath}";

                var body = BuildOpenAiBody(model, testMessages, null, stream: false);
                var serialized = JsonSerializer.Serialize(body);
                var resp = await SendWithRetryAsync(client, () =>
                {
                    var r = new HttpRequestMessage(HttpMethod.Post, fullUrl)
                    {
                        Content = new StringContent(serialized, Encoding.UTF8, "application/json")
                    };
                    ApplyExtraHeaders(r, provider);
                    return r;
                }, maxRetries: 1);
                var raw = await resp.Content.ReadAsStringAsync();
                var parsed = ParseOpenAiResponse(raw, sw.ElapsedMilliseconds);
                response = parsed.Content;
                pt = parsed.PromptTokens;
                ct = parsed.CompletionTokens;
                tt = parsed.TotalTokens;
            }

            sw.Stop();
            return new TestResult { Success = true, Message = "Model responded successfully", LatencyMs = sw.ElapsedMilliseconds, Response = response, PromptTokens = pt, CompletionTokens = ct, TotalTokens = tt };
        }
        catch (Exception ex)
        {
            sw.Stop();
            return new TestResult { Success = false, Message = ex.Message, LatencyMs = sw.ElapsedMilliseconds };
        }
    }

    private static string ModelKey(AIModel model) => string.IsNullOrWhiteSpace(model.Location)
        ? (model.ActualModelName ?? model.Name)
        : $"{model.ActualModelName ?? model.Name}@{model.Location}";

    private static long EstimateTokens(IEnumerable<ChatMessageDto> messages)
    {
        long total = 0;
        foreach (var m in messages) total += Math.Max(1, m.Content.Length / 4);
        return total;
    }

    private static long EstimateToolsTokens(List<ChatToolDto>? tools)
    {
        if (tools is not { Count: > 0 }) return 0;
        try
        {
            return Math.Max(1, JsonSerializer.Serialize(tools, JsonOptions).Length / 4);
        }
        catch (JsonException)
        {
            return 0;
        }
    }

    private static (List<ChatMessageDto> Messages, ChatSettingsDto? Settings, List<ChatToolDto>? Tools) PrepareForTpm(List<ChatMessageDto> messages, ChatSettingsDto? settings, List<ChatToolDto>? tools, long tpmLimit)
    {
        if (tpmLimit <= 0)
            return (messages, settings, tools);

        long toolsEst = EstimateToolsTokens(tools);
        long est = EstimateTokens(messages) + toolsEst;
        long budget = tpmLimit - TpmOutputReserve;
        if (est <= budget)
            return (messages, settings, tools);

        var reducedTools = tools;
        if (toolsEst > budget * 6 / 10)
        {
            long toolsTarget = Math.Max(1, budget * 6 / 10);
            reducedTools = ReduceTools(tools, toolsTarget, out _);
            toolsEst = EstimateToolsTokens(reducedTools);
        }
        long targetMessages = Math.Max(1, budget - toolsEst);
        var (trimmed, _) = TrimMessages(messages, targetMessages);
        long finalEst = EstimateTokens(trimmed) + EstimateToolsTokens(reducedTools);

        int maxOut = NormalizeMaxTokens(settings?.MaxTokens ?? DefaultMaxTokens);
        int capped = (int)Math.Clamp(tpmLimit - finalEst, 1, maxOut);
        var newSettings = (settings ?? new ChatSettingsDto()) with { MaxTokens = capped };
        return (trimmed, newSettings, reducedTools);
    }

    private static (List<ChatMessageDto> Messages, bool Changed) TrimMessages(List<ChatMessageDto> messages, long targetEstimate)
    {
        var msgs = messages.ToList();
        bool changed = false;
        long est = EstimateTokens(msgs);
        while (est > targetEstimate && msgs.Count > 1)
        {
            int drop = -1;
            for (int i = 0; i < msgs.Count - 1; i++)
            {
                var m = msgs[i];
                if (m.Role == "system" || m.Role == "tool" || (m.Role == "assistant" && m.ToolCalls is { Count: > 0 })) continue;
                drop = i;
                break;
            }
            if (drop < 0) break;
            est -= EstimateTokens(new List<ChatMessageDto> { msgs[drop] });
            msgs.RemoveAt(drop);
            changed = true;
        }
        if (est > targetEstimate)
        {
            for (int i = 0; i < msgs.Count - 1 && est > targetEstimate; i++)
            {
                var m = msgs[i];
                if (string.IsNullOrEmpty(m.Content)) continue;
                long excess = est - targetEstimate;
                int keep = Math.Max(200, m.Content.Length - (int)(excess * 4));
                if (keep < m.Content.Length)
                {
                    long before = m.Content.Length / 4;
                    msgs[i] = msgs[i] with { Content = m.Content[..keep] };
                    est -= before - msgs[i].Content.Length / 4;
                    changed = true;
                }
            }
            if (est > targetEstimate)
            {
                for (int i = msgs.Count - 1; i >= 0 && est > targetEstimate; i--)
                {
                    if (string.IsNullOrEmpty(msgs[i].Content)) continue;
                    long excess = est - targetEstimate;
                    int keep = Math.Max(100, msgs[i].Content.Length - (int)(excess * 4));
                    if (keep < msgs[i].Content.Length)
                    {
                        msgs[i] = msgs[i] with { Content = msgs[i].Content[^keep..] };
                        changed = true;
                    }
                }
            }
        }
        return (msgs, changed);
    }

    private (List<ChatMessageDto> Messages, ChatSettingsDto? Settings, List<ChatToolDto>? Tools)? TrimForTpm(string errorMessage, List<ChatMessageDto> messages, ChatSettingsDto? settings, List<ChatToolDto>? tools, ref long tpmLimit)
    {
        long requested = 0;
        long used = 0;
        var lm = Regex.Match(errorMessage, @"Limit (\d+)");
        if (lm.Success && long.TryParse(lm.Groups[1].Value, out var l)) tpmLimit = l;
        var rm = Regex.Match(errorMessage, @"Requested (\d+)");
        if (rm.Success) long.TryParse(rm.Groups[1].Value, out requested);
        var um = Regex.Match(errorMessage, @"Used (\d+)");
        if (um.Success) long.TryParse(um.Groups[1].Value, out used);
        long effectiveLimit = Math.Max(TpmOutputReserve, tpmLimit - used);

        long toolsEst = EstimateToolsTokens(tools);
        long currentEst = EstimateTokens(messages) + toolsEst;
        double scale = requested > 0 ? (double)requested / Math.Max(1, currentEst) : 1.0;
        long targetTotal = (long)((effectiveLimit - TpmOutputReserve) / scale);
        long targetMessages = Math.Max(1, targetTotal - toolsEst);

        var (trimmed, changed) = TrimMessages(messages, targetMessages);

        var reducedTools = tools;
        long est = EstimateTokens(trimmed) + toolsEst;
        if (est > targetTotal)
        {
            long toolsTarget = Math.Max(0, targetTotal - EstimateTokens(trimmed));
            reducedTools = ReduceTools(tools, toolsTarget, out var removed);
            if (removed > 0) changed = true;
            est = EstimateTokens(trimmed) + EstimateToolsTokens(reducedTools);
        }

        if (!changed) return null;

        int maxOut = NormalizeMaxTokens(settings?.MaxTokens ?? DefaultMaxTokens);
        int capped = (int)Math.Clamp(effectiveLimit - est, 1, maxOut);
        var newSettings = (settings ?? new ChatSettingsDto()) with { MaxTokens = capped };
        _logger.LogWarning("TPM limit exceeded (Limit={Limit}, Used={Used}, Requested={Requested}); trimmed request to fit (messages {Before}->{After}, tools {ToolBefore}->{ToolAfter})", tpmLimit, used, requested, messages.Count, trimmed.Count, tools?.Count ?? 0, reducedTools?.Count ?? 0);
        return (trimmed, newSettings, reducedTools);
    }

    private static List<ChatToolDto>? ReduceTools(List<ChatToolDto>? tools, long targetToolsEstimate, out int removed)
    {
        removed = 0;
        if (tools is not { Count: > 0 }) return tools;
        var list = tools.ToList();
        long est = EstimateToolsTokens(list);
        if (est <= targetToolsEstimate) return tools;
        var sorted = list.OrderByDescending(t => JsonSerializer.Serialize(t, JsonOptions).Length).ToList();
        while (est > targetToolsEstimate && sorted.Count > removed)
        {
            est -= EstimateToolsTokens(new List<ChatToolDto> { sorted[removed] });
            removed++;
        }
        if (removed == 0) return tools;
        return sorted.Skip(removed).ToList();
    }

    private async Task<ChatCompletionResult> SendCustomRestAsync(Provider provider, AIModel model, List<ChatMessageDto> messages, ChatSettingsDto? settings, bool stream)
    {
        var client = _httpClientFactory.CreateClient();
        client.Timeout = TimeSpan.FromSeconds(provider.Timeout ?? 60);
        ApplyAuth(client, provider);

        var (url, bodyJson) = BuildCustomRequest(provider, model, messages, settings, stream);
        var resp = await SendWithRetryAsync(client, () =>
        {
            var r = new HttpRequestMessage(HttpMethod.Post, url)
            {
                Content = new StringContent(bodyJson, Encoding.UTF8, "application/json")
            };
            if (stream) r.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("text/event-stream"));
            ApplyExtraHeaders(r, provider);
            return r;
        });
        var raw = await resp.Content.ReadAsStringAsync();
        return ExtractCustomResponse(provider, model, raw, latencyMs: 0);
    }

    private async IAsyncEnumerable<ChatCompletionResult> SendCustomRestStreamAsync(Provider provider, AIModel model, List<ChatMessageDto> messages, ChatSettingsDto? settings)
    {
        var client = _httpClientFactory.CreateClient();
        client.Timeout = TimeSpan.FromSeconds(provider.Timeout ?? 60);
        ApplyAuth(client, provider);

        var (url, bodyJson) = BuildCustomRequest(provider, model, messages, settings, stream: true);
        var resp = await SendWithRetryAsync(client, () =>
        {
            var r = new HttpRequestMessage(HttpMethod.Post, url)
            {
                Content = new StringContent(bodyJson, Encoding.UTF8, "application/json")
            };
            r.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("text/event-stream"));
            ApplyExtraHeaders(r, provider);
            return r;
        }, HttpCompletionOption.ResponseHeadersRead);

        var streamMode = (provider.ResponseTemplate ?? "").Trim().StartsWith("sse:", StringComparison.OrdinalIgnoreCase);
        using var stream = await resp.Content.ReadAsStreamAsync();
        using var reader = new StreamReader(stream);

        if (streamMode)
        {
            var template = (provider.ResponseTemplate ?? "").Substring(4).Trim();
            while (!reader.EndOfStream)
            {
                var line = await reader.ReadLineAsync();
                if (string.IsNullOrEmpty(line)) continue;
                if (line.StartsWith("data: [DONE]")) break;
                if (!line.StartsWith("data: ")) continue;
                var dataJson = line[6..];
                var chunk = ExtractByJsonPath(dataJson, template);
                if (!string.IsNullOrEmpty(chunk))
                    yield return new ChatCompletionResult { Content = chunk };
            }
        }
        else
        {
            var full = await reader.ReadToEndAsync();
            var result = ExtractCustomResponse(provider, model, full, latencyMs: 0);
            if (!string.IsNullOrEmpty(result.Content))
                yield return result;
        }
        await Task.CompletedTask;
    }

    private static (string Url, string Body) BuildCustomRequest(Provider provider, AIModel model, List<ChatMessageDto> messages, ChatSettingsDto? settings, bool stream)
    {
        var url = provider.BaseUrl;
        var template = provider.BodyTemplate;
        string bodyJson;
        if (string.IsNullOrWhiteSpace(template))
        {
            var defaultBody = new
            {
                model = ModelKey(model),
                messages = messages.Select(m => new { role = m.Role, content = m.Content }),
                temperature = settings?.Temperature ?? 0.7,
            max_tokens = NormalizeMaxTokens(settings?.MaxTokens ?? Math.Min(model.MaxTokens ?? 4096, 4096)),
                stream,
            };
            bodyJson = JsonSerializer.Serialize(defaultBody);
        }
        else
        {
            var replacements = new Dictionary<string, string>
            {
                ["{{model}}"] = ModelKey(model),
                ["{{messages}}"] = JsonSerializer.Serialize(messages.Select(m => new { role = m.Role, content = m.Content })),
                ["{{temperature}}"] = (settings?.Temperature ?? 0.7).ToString(System.Globalization.CultureInfo.InvariantCulture),
                ["{{max_tokens}}"] = NormalizeMaxTokens(settings?.MaxTokens ?? Math.Min(model.MaxTokens ?? 4096, 4096)).ToString(),
                ["{{stream}}"] = stream ? "true" : "false",
            };
            bodyJson = template;
            foreach (var kv in replacements) bodyJson = bodyJson.Replace(kv.Key, kv.Value);
        }
        return (url, bodyJson);
    }

    private static ChatCompletionResult ExtractCustomResponse(Provider provider, AIModel model, string raw, long latencyMs)
    {
        var template = provider.ResponseTemplate;
        var content = string.IsNullOrWhiteSpace(template)
            ? ExtractByJsonPath(raw, "$.choices[0].message.content")
            : ExtractByJsonPath(raw, template);

        if (string.IsNullOrEmpty(content))
            content = ExtractByJsonPath(raw, "$.content") ?? ExtractByJsonPath(raw, "$.text") ?? "";

        long pt = 0, ct = 0;
        var ptStr = ExtractByJsonPath(raw, "$.usage.prompt_tokens");
        var ctStr = ExtractByJsonPath(raw, "$.usage.completion_tokens");
        if (long.TryParse(ptStr, out var p)) pt = p;
        if (long.TryParse(ctStr, out var cm)) ct = cm;
        if (pt == 0 && ct == 0)
        {
            pt = EstimateTokens(new List<ChatMessageDto> { new("user", "") });
            ct = EstimateTokens(new List<ChatMessageDto> { new("assistant", content) });
        }
        return new ChatCompletionResult
        {
            Content = content,
            PromptTokens = pt,
            CompletionTokens = ct,
            TotalTokens = pt + ct,
            LatencyMs = latencyMs,
        };
    }

    private static string ExtractByJsonPath(string json, string path)
    {
        try
        {
            using var doc = JsonDocument.Parse(json);
            var node = NavigatePath(doc.RootElement, path);
            if (!node.HasValue) return "";
            var n = node.Value;
            if (n.ValueKind == JsonValueKind.String) return n.GetString() ?? "";
            if (n.ValueKind == JsonValueKind.Number) return n.GetRawText();
            if (n.ValueKind == JsonValueKind.True || n.ValueKind == JsonValueKind.False) return n.GetBoolean().ToString();
            return n.GetRawText() ?? "";
        }
        catch
        {
            return "";
        }
    }

    private static JsonElement? NavigatePath(JsonElement root, string path)
    {
        if (string.IsNullOrWhiteSpace(path)) return null;
        var p = path.Trim();
        if (p.StartsWith("$")) p = p.Length > 1 && (p[1] == '.' || p[1] == '[') ? p[2..] : p[1..];
        var current = root;
        int i = 0;
        while (i < p.Length)
        {
            if (p[i] == '.')
            {
                i++;
                int start = i;
                while (i < p.Length && p[i] != '.' && p[i] != '[') i++;
                var key = p[start..i];
                if (!current.TryGetProperty(key, out var next)) return null;
                current = next;
            }
            else if (p[i] == '[')
            {
                i++;
                int start = i;
                while (i < p.Length && p[i] != ']') i++;
                if (!int.TryParse(p[start..i], out var idx)) return null;
                i++;
                if (current.ValueKind != JsonValueKind.Array || idx >= current.GetArrayLength()) return null;
                current = current[idx];
            }
            else
            {
                int start = i;
                while (i < p.Length && p[i] != '.' && p[i] != '[') i++;
                var key = p[start..i];
                if (key.Length == 0) continue;
                if (!current.TryGetProperty(key, out var next)) return null;
                current = next;
            }
        }
        return current;
    }
}