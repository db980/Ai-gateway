namespace AIGateway.Application.Interfaces;

public record PaymentRequest(decimal Amount, string Currency, string Description, string? CardToken, string? CardHolder = null);
public record PaymentResult(bool Success, string? TransactionId, string? ErrorMessage, string CardLast4 = "");

public interface IPaymentGateway
{
    string Name { get; }
    Task<PaymentResult> ChargeAsync(PaymentRequest request, CancellationToken ct = default);
}
