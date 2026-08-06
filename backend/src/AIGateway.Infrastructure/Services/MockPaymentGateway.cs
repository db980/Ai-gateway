using AIGateway.Application.Interfaces;
namespace AIGateway.Infrastructure.Services;

public class MockPaymentGateway : IPaymentGateway
{
    public string Name => "Mock (sandbox)";
    public async Task<PaymentResult> ChargeAsync(PaymentRequest request, CancellationToken ct = default)
    {
        await Task.Delay(400, ct);
        if (string.Equals(request.CardToken, "tok_decline", StringComparison.OrdinalIgnoreCase))
            return new PaymentResult(false, null, "Card was declined by the sandbox gateway. Use a different card (e.g. 4242 4242 4242 4242).");
        return new PaymentResult(true, $"mock_{Guid.NewGuid():N}", null, "4242");
    }
}
