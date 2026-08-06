using System.Net.Http.Headers;
using System.Text.Json;
using AIGateway.Application.Interfaces;
namespace AIGateway.Infrastructure.Services;

public class StripePaymentGateway : IPaymentGateway
{
    private readonly HttpClient _http;
    private readonly string _secretKey;
    public string Name => "Stripe";
    public StripePaymentGateway(string secretKey, IHttpClientFactory factory)
    {
        _secretKey = secretKey;
        _http = factory.CreateClient();
    }

    public async Task<PaymentResult> ChargeAsync(PaymentRequest request, CancellationToken ct = default)
    {
        using var req = new HttpRequestMessage(HttpMethod.Post, "https://api.stripe.com/v1/payment_intents")
        {
            Content = new FormUrlEncodedContent(new Dictionary<string, string>
            {
                ["amount"] = ((long)Math.Round(request.Amount * 100, MidpointRounding.AwayFromZero)).ToString(),
                ["currency"] = request.Currency.ToLowerInvariant(),
                ["payment_method"] = request.CardToken ?? "",
                ["confirm"] = "true",
                ["description"] = request.Description,
            })
        };
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _secretKey);
        var resp = await _http.SendAsync(req, ct);
        var json = await resp.Content.ReadAsStringAsync(ct);
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;
        if (!resp.IsSuccessStatusCode)
        {
            var message = root.TryGetProperty("error", out var err) && err.TryGetProperty("message", out var m) ? m.GetString() : "Stripe payment failed";
            return new PaymentResult(false, null, message);
        }
        var id = root.TryGetProperty("id", out var idEl) ? idEl.GetString() : null;
        var status = root.TryGetProperty("status", out var stEl) ? stEl.GetString() : null;
        if (string.IsNullOrEmpty(id) || status != "succeeded")
            return new PaymentResult(false, id, $"Payment not completed (status: {status ?? "unknown"})");
        var last4 = "";
        if (root.TryGetProperty("charges", out var ch) && ch.ValueKind == JsonValueKind.Array && ch.GetArrayLength() > 0)
        {
            var first = ch[0];
            if (first.TryGetProperty("payment_method_details", out var pmd) && pmd.TryGetProperty("card", out var card) && card.TryGetProperty("last4", out var l4)) last4 = l4.GetString() ?? "";
        }
        return new PaymentResult(true, id, null, last4);
    }
}
