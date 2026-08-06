using AIGateway.Application.DTOs;
namespace AIGateway.Application.Billing;

public static class PlanCatalog
{
    public static readonly PlanDto[] Plans =
    {
        new("Free", 0m, "forever", 100_000, new[] { "100K tokens included", "Community support", "Standard rate limits" }, 500, false),
        new("Starter", 9m, "/month", 1_000_000, new[] { "1M tokens included", "Email support", "Higher rate limits" }, 5_000, true),
        new("Professional", 49m, "/month", 10_000_000, new[] { "10M tokens included", "Priority support", "All models unlocked" }, 50_000, true),
        new("Enterprise", 199m, "/month", 100_000_000, new[] { "100M tokens included", "Dedicated support", "Custom SLAs", "SSO + audit log" }, 500_000, true),
    };

    public static PlanDto? Find(string name) => Plans.FirstOrDefault(p => string.Equals(p.Name, name, StringComparison.OrdinalIgnoreCase));

    public static PlanDto? FindByPrice(decimal price) => Plans.FirstOrDefault(p => p.Price == price);
}
