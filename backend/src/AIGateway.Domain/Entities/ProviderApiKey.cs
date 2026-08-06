namespace AIGateway.Domain.Entities;
public class ProviderApiKey
{
    public Guid Id { get; set; }
    public Guid ProviderId { get; set; }
    public string KeyValue { get; set; } = string.Empty;
    public string? Name { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public Provider Provider { get; set; } = null!;
}
