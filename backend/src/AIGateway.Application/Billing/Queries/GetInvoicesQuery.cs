using MediatR; using AIGateway.Application.DTOs; using AIGateway.Domain.Interfaces; using AIGateway.Domain.Entities; using Microsoft.EntityFrameworkCore;
namespace AIGateway.Application.Billing.Queries;
public record GetInvoicesQuery(Guid UserId) : IRequest<IEnumerable<InvoiceDto>>;
public class GetInvoicesQueryHandler : IRequestHandler<GetInvoicesQuery, IEnumerable<InvoiceDto>>
{
    private readonly IUnitOfWork _uow;
    public GetInvoicesQueryHandler(IUnitOfWork uow) { _uow = uow; }
    public async Task<IEnumerable<InvoiceDto>> Handle(GetInvoicesQuery request, CancellationToken ct)
    {
        var rows = await _uow.Repository<Invoice>().Query().Where(i => i.UserId == request.UserId).OrderByDescending(i => i.CreatedAt).ToListAsync(ct);
        return rows.Select(i => new InvoiceDto(
            i.Id, i.InvoiceNumber,
            i.Amount == 0 ? "Free" : PlanCatalog.FindByPrice(i.Amount)?.Name ?? "Legacy",
            i.Amount, i.Currency, i.Status, i.StripeInvoiceId, i.CreatedAt, i.PaidAt)).ToList();
    }
}
