namespace AIGateway.Domain.Entities;
public class Provider
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string BaseUrl { get; set; } = string.Empty;
    public string? ApiKey { get; set; }
    public DateTime? ApiKeyExpiresAt { get; set; }
    public string? Organization { get; set; }
    public bool IsActive { get; set; } = true;
    public int Priority { get; set; }
    public int? RateLimit { get; set; }
    public int? Timeout { get; set; }
    public string? Headers { get; set; }
    public string? AuthType { get; set; }
    public string? BodyTemplate { get; set; }
    public string? ResponseTemplate { get; set; }
    public string? ErrorTemplate { get; set; }
    public string ChatEndpointPath { get; set; } = "chat/completions";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    public ICollection<AIModel> Models { get; set; } = new List<AIModel>();
    public ICollection<ProviderApiKey> ApiKeys { get; set; } = new List<ProviderApiKey>();
}
