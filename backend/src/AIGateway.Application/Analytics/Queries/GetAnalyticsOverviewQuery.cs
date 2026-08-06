using MediatR; using AIGateway.Application.DTOs; using AIGateway.Domain.Interfaces; using AIGateway.Domain.Entities; using Microsoft.EntityFrameworkCore;
namespace AIGateway.Application.Analytics.Queries;
public record GetAnalyticsOverviewQuery : IRequest<AnalyticsOverviewDto>;
public class GetAnalyticsOverviewQueryHandler : IRequestHandler<GetAnalyticsOverviewQuery, AnalyticsOverviewDto>
{
    private readonly IUnitOfWork _uow;
    public GetAnalyticsOverviewQueryHandler(IUnitOfWork uow) { _uow = uow; }
    public async Task<AnalyticsOverviewDto> Handle(GetAnalyticsOverviewQuery request, CancellationToken ct)
    {
        var records = await _uow.Repository<UsageRecord>().Query()
            .Select(r => new { r.TotalTokens, r.Cost, r.LatencyMs })
            .ToListAsync(ct);
        return new AnalyticsOverviewDto(
            records.Count,
            await _uow.Repository<User>().Query().CountAsync(ct),
            records.Sum(r => r.TotalTokens),
            records.Sum(r => r.Cost ?? 0),
            records.Where(r => r.LatencyMs.HasValue).Average(r => (double?)(r.LatencyMs ?? 0)) ?? 0
        );
    }
}
