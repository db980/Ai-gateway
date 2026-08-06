using MediatR; using AIGateway.Application.DTOs; using AIGateway.Application.Interfaces; using AIGateway.Domain.Entities; using AIGateway.Domain.Interfaces; using Microsoft.EntityFrameworkCore;
namespace AIGateway.Application.Billing.Queries;
public record GetBillingSummaryQuery(Guid UserId) : IRequest<BillingSummaryDto>;
public class GetBillingSummaryQueryHandler : IRequestHandler<GetBillingSummaryQuery, BillingSummaryDto>
{
    private readonly IUnitOfWork _uow;
    private readonly IPaymentGateway _gateway;
    public GetBillingSummaryQueryHandler(IUnitOfWork uow, IPaymentGateway gateway) { _uow = uow; _gateway = gateway; }
    public async Task<BillingSummaryDto> Handle(GetBillingSummaryQuery request, CancellationToken ct)
    {
        var user = await _uow.Repository<User>().Query().FirstOrDefaultAsync(u => u.Id == request.UserId, ct) ?? throw new KeyNotFoundException("User not found");
        var paid = await _uow.Repository<Invoice>().Query().Where(i => i.UserId == request.UserId && i.Status == "Paid").ToListAsync(ct);
        var totalSpent = paid.Sum(i => i.Amount);
        var lastPaid = paid.OrderByDescending(i => i.PaidAt).FirstOrDefault();
        return new BillingSummaryDto(user.Plan.ToString(), user.Credits, _gateway.Name, totalSpent, lastPaid?.PaidAt?.AddMonths(1));
    }
}
