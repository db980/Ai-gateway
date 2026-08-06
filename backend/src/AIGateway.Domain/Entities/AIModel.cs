using AIGateway.Domain.Enums;
namespace AIGateway.Domain.Entities;
public class AIModel
{
    public Guid Id { get; set; }
    public Guid ProviderId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? DisplayName { get; set; }
    public string? ActualModelName { get; set; }
    public string? AlternativeModelName { get; set; }
    public string? Location { get; set; }
    public int? ContextWindow { get; set; }
    public int? MaxTokens { get; set; }
    public bool SupportsImages { get; set; }
    public bool SupportsVision { get; set; }
    public bool SupportsAudio { get; set; }
    public bool SupportsFunctionCalling { get; set; }
    public bool SupportsStreaming { get; set; } = true;
    public bool IsFree { get; set; }
    public ModelStatus Status { get; set; } = ModelStatus.Active;
    public decimal? PricePerPromptToken { get; set; }
    public decimal? PricePerCompletionToken { get; set; }
    public long? TpmLimit { get; set; }
    public long? TpdLimit { get; set; }
    public int? RpmLimit { get; set; }
    public int? MaxConcurrency { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public Provider Provider { get; set; } = null!;
}
