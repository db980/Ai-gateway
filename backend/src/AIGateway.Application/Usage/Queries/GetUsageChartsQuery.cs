using MediatR; using AIGateway.Application.DTOs; using AIGateway.Domain.Interfaces; using AIGateway.Domain.Entities; using Microsoft.EntityFrameworkCore;
namespace AIGateway.Application.Usage.Queries;
public record GetUsageChartsQuery(Guid UserId, int Days = 30, string? ProviderName = null, string? ModelName = null, DateTime? From = null, DateTime? To = null) : IRequest<List<UsageChartDto>>;
public class GetUsageChartsQueryHandler : IRequestHandler<GetUsageChartsQuery, List<UsageChartDto>>
{
    private readonly IUnitOfWork _uow;
    public GetUsageChartsQueryHandler(IUnitOfWork uow) { _uow = uow; }
    public async Task<List<UsageChartDto>> Handle(GetUsageChartsQuery request, CancellationToken ct)
    {
        var since = request.From ?? DateTime.UtcNow.Date.AddDays(-request.Days);
        var until = request.To ?? DateTime.UtcNow;
        var q = _uow.Repository<UsageRecord>().Query()
            .Where(r => r.UserId == request.UserId && r.CreatedAt >= since && r.CreatedAt <= until);
        if (!string.IsNullOrEmpty(request.ProviderName)) q = q.Where(r => r.ProviderName == request.ProviderName);
        if (!string.IsNullOrEmpty(request.ModelName)) q = q.Where(r => r.ModelName == request.ModelName);
        var data = await q
            .Select(r => new { r.CreatedAt, r.TotalTokens, r.Cost, r.PromptTokens, r.CompletionTokens, r.IsSuccess, r.LatencyMs })
            .ToListAsync(ct);

        return data
            .GroupBy(r => r.CreatedAt.Date)
            .OrderBy(g => g.Key)
            .Select(g => new UsageChartDto(
                g.Key,
                g.Count(),
                g.Sum(r => r.TotalTokens),
                g.Sum(r => r.Cost ?? 0),
                g.Sum(r => r.PromptTokens),
                g.Sum(r => r.CompletionTokens),
                g.Count(r => !r.IsSuccess),
                g.Where(r => r.LatencyMs.HasValue).Select(r => r.LatencyMs!.Value).DefaultIfEmpty(0).Average()))
            .ToList();
    }
}
