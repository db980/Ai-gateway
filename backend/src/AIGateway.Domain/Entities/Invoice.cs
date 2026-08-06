using AIGateway.Domain.Enums;
namespace AIGateway.Domain.Entities;
public class Invoice
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string InvoiceNumber { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "USD";
    public string Status { get; set; } = "Pending";
    public string? StripeInvoiceId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? PaidAt { get; set; }
}
