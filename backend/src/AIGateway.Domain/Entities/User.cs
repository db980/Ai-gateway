using AIGateway.Domain.Enums;
namespace AIGateway.Domain.Entities;
public class User
{
    public Guid Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public UserRole Role { get; set; } = UserRole.User;
    public bool IsActive { get; set; } = true;
    public decimal Credits { get; set; }
    public string? StripeCustomerId { get; set; }
    public PlanType Plan { get; set; } = PlanType.Free;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    public ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();
    public ICollection<ApiKey> ApiKeys { get; set; } = new List<ApiKey>();
    public ICollection<UsageRecord> UsageRecords { get; set; } = new List<UsageRecord>();
}
