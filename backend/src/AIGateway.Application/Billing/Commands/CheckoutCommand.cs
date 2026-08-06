using MediatR; using AIGateway.Application.DTOs; using AIGateway.Application.Interfaces; using AIGateway.Domain.Entities; using AIGateway.Domain.Enums; using AIGateway.Domain.Interfaces; using Microsoft.EntityFrameworkCore;
namespace AIGateway.Application.Billing.Commands;
public record CheckoutCommand(Guid UserId, CheckoutRequestDto Request) : IRequest<CheckoutResultDto>;
public class CheckoutCommandHandler : IRequestHandler<CheckoutCommand, CheckoutResultDto>
{
    private readonly IUnitOfWork _uow;
    private readonly IPaymentGateway _gateway;
    public CheckoutCommandHandler(IUnitOfWork uow, IPaymentGateway gateway) { _uow = uow; _gateway = gateway; }
    public async Task<CheckoutResultDto> Handle(CheckoutCommand command, CancellationToken ct)
    {
        var user = await _uow.Repository<User>().Query().FirstOrDefaultAsync(u => u.Id == command.UserId, ct);
        if (user is null) return new CheckoutResultDto(false, null, null, null, null, "User not found");
        var plan = PlanCatalog.Find(command.Request.Plan);
        if (plan is null || !plan.IsPaid) return new CheckoutResultDto(false, null, null, null, null, "Invalid or non-subscription plan");
        if (string.Equals(user.Plan.ToString(), plan.Name, StringComparison.OrdinalIgnoreCase))
            return new CheckoutResultDto(false, null, null, null, null, "You are already on this plan");

        var payment = await _gateway.ChargeAsync(new PaymentRequest(plan.Price, "USD", $"{plan.Name} plan subscription", command.Request.CardToken, command.Request.CardHolder), ct);
        if (!payment.Success) return new CheckoutResultDto(false, null, null, null, null, payment.ErrorMessage ?? "Payment failed");

        await _uow.BeginTransactionAsync();
        try
        {
            var invoice = new Invoice
            {
                Id = Guid.NewGuid(),
                UserId = user.Id,
                InvoiceNumber = $"INV-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString("N")[..8].ToUpperInvariant()}",
                Amount = plan.Price,
                Currency = "USD",
                Status = "Paid",
                StripeInvoiceId = payment.TransactionId,
                CreatedAt = DateTime.UtcNow,
                PaidAt = DateTime.UtcNow,
            };
            user.Plan = (PlanType)Enum.Parse(typeof(PlanType), plan.Name, ignoreCase: true);
            user.Credits += plan.TokensIncluded;
            user.UpdatedAt = DateTime.UtcNow;
            await _uow.Repository<Invoice>().AddAsync(invoice);
            await _uow.SaveChangesAsync();
            await _uow.CommitTransactionAsync();
            var dto = new InvoiceDto(invoice.Id, invoice.InvoiceNumber, plan.Name, invoice.Amount, invoice.Currency, invoice.Status, invoice.StripeInvoiceId, invoice.CreatedAt, invoice.PaidAt);
            return new CheckoutResultDto(true, plan.Name, invoice.Amount, payment.TransactionId, dto, null);
        }
        catch
        {
            await _uow.RollbackTransactionAsync();
            throw;
        }
    }
}
