using AIGateway.Application.DTOs;
namespace AIGateway.Application.Interfaces;
public class ChatCompletionResult
{
    public string Content { get; set; } = string.Empty;
    public string Reasoning { get; set; } = string.Empty;
    public long PromptTokens { get; set; }
    public long CompletionTokens { get; set; }
    public long TotalTokens { get; set; }
    public long LatencyMs { get; set; }
    public string? FinishReason { get; set; }
    public List<ChatToolCallDto>? ToolCalls { get; set; }
    public List<ChatStreamToolCall>? ToolCallDeltas { get; set; }
}
public class TestResult
{
    public bool Success { get; set; }
    public string? Message { get; set; }
    public long LatencyMs { get; set; }
    public string? Response { get; set; }
    public string? Status { get; set; }
    public long PromptTokens { get; set; }
    public long CompletionTokens { get; set; }
    public long TotalTokens { get; set; }
}
public interface IAiProviderService
{
    Task<ChatCompletionResult> SendChatAsync(Guid modelId, List<ChatMessageDto> messages, ChatSettingsDto? settings = null, List<ChatToolDto>? tools = null, object? toolChoice = null);
    IAsyncEnumerable<ChatCompletionResult> SendChatStreamAsync(Guid modelId, List<ChatMessageDto> messages, ChatSettingsDto? settings = null, List<ChatToolDto>? tools = null, object? toolChoice = null);
    Task<TestResult> TestModelAsync(Guid modelId);
}