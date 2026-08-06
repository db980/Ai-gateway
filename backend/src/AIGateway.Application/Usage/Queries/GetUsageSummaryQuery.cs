using MediatR; using AIGateway.Application.DTOs; using AIGateway.Domain.Interfaces; using AIGateway.Domain.Entities; using Microsoft.EntityFrameworkCore;
namespace AIGateway.Application.Usage.Queries;
public record GetUsageSummaryQuery(Guid UserId) : IRequest<UsageSummaryDto>;
public class GetUsageSummaryQueryHandler : IRequestHandler<GetUsageSummaryQuery, UsageSummaryDto>
{
    private readonly IUnitOfWork _uow;
    public GetUsageSummaryQueryHandler(IUnitOfWork uow) { _uow = uow; }
    public async Task<UsageSummaryDto> Handle(GetUsageSummaryQuery request, CancellationToken ct)
    {
        var rows = await _uow.Repository<UsageRecord>().Query()
            .Where(r => r.UserId == request.UserId)
            .Select(r => new { r.CreatedAt, r.TotalTokens, r.PromptTokens, r.CompletionTokens, r.Cost, r.IsSuccess })
            .ToListAsync(ct);
        var today = DateTime.UtcNow.Date;
        return new UsageSummaryDto(
            rows.Count,
            rows.Count(r => r.CreatedAt >= today),
            rows.Sum(r => r.TotalTokens),
            rows.Sum(r => r.PromptTokens),
            rows.Sum(r => r.CompletionTokens),
            rows.Sum(r => r.Cost ?? 0),
            rows.Count(r => !r.IsSuccess),
            await _uow.Repository<ApiKey>().Query().CountAsync(k => k.UserId == request.UserId && k.Status == Domain.Enums.ApiKeyStatus.Active, ct)
        );
    }
}
