using AIGateway.Domain.Enums;
namespace AIGateway.Domain.Entities;
public class ApiKey
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Key { get; set; } = string.Empty;
    public string Prefix { get; set; } = string.Empty;
    public string? Name { get; set; }
    public ApiKeyStatus Status { get; set; } = ApiKeyStatus.Active;
    public DateTime? ExpiresAt { get; set; }
    public string? IpWhitelist { get; set; }
    public int? RateLimit { get; set; }
    public long? Quota { get; set; }
    public long UsedTokens { get; set; }
    public bool RestrictToActiveModels { get; set; }
    public string? AllowedModelIds { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public User User { get; set; } = null!;
}
