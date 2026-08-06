namespace AIGateway.Application.DTOs;
public record PlanDto(string Name, decimal Price, string BillingCycle, long TokensIncluded, string[] Features, int MaxRequestsPerDay, bool IsPaid);
public record BillingSummaryDto(string CurrentPlan, decimal Credits, string Gateway, decimal TotalSpent, DateTime? NextBillingDate);
public record InvoiceDto(Guid Id, string InvoiceNumber, string Plan, decimal Amount, string Currency, string Status, string? GatewayRef, DateTime CreatedAt, DateTime? PaidAt);
public record CheckoutRequestDto(string Plan, string CardToken, string? CardHolder = null);
public record CheckoutResultDto(bool Success, string? NewPlan, decimal? Amount, string? TransactionId, InvoiceDto? Invoice, string? ErrorMessage);
public record CancelResultDto(bool Success, string Message);
