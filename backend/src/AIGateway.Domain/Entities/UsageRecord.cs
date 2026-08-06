namespace AIGateway.Domain.Entities;
public class UsageRecord
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public Guid? ApiKeyId { get; set; }
    public Guid? ProviderId { get; set; }
    public Guid? ModelId { get; set; }
    public string? ModelName { get; set; }
    public string? ProviderName { get; set; }
    public long PromptTokens { get; set; }
    public long CompletionTokens { get; set; }
    public long TotalTokens { get; set; }
    public decimal? Cost { get; set; }
    public long? LatencyMs { get; set; }
    public bool IsSuccess { get; set; }
    public string? ErrorMessage { get; set; }
    public string? IpAddress { get; set; }
    public long? RequestSize { get; set; }
    public long? ResponseSize { get; set; }
    public string? RequestContent { get; set; }
    public string? ResponseContent { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public User User { get; set; } = null!;
    public ApiKey? ApiKey { get; set; }
}
