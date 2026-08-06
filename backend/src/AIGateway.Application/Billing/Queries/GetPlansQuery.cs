using MediatR; using AIGateway.Application.DTOs;
namespace AIGateway.Application.Billing.Queries;
public record GetPlansQuery : IRequest<IEnumerable<PlanDto>>;
public class GetPlansQueryHandler : IRequestHandler<GetPlansQuery, IEnumerable<PlanDto>>
{
    public Task<IEnumerable<PlanDto>> Handle(GetPlansQuery request, CancellationToken ct) => Task.FromResult(PlanCatalog.Plans.AsEnumerable());
}
