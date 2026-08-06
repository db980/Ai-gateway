using MediatR; using AIGateway.Application.DTOs; using AIGateway.Domain.Interfaces; using AIGateway.Domain.Entities; using Microsoft.EntityFrameworkCore;
namespace AIGateway.Application.Usage.Queries;
public record GetUsageRecordsQuery(Guid UserId, int Page = 1, int PageSize = 50, int? Days = null, bool IncludeContent = false, Guid? ApiKeyId = null) : IRequest<List<UsageRecordDto>>;
public class GetUsageRecordsQueryHandler : IRequestHandler<GetUsageRecordsQuery, List<UsageRecordDto>>
{
    private readonly IUnitOfWork _uow;
    public GetUsageRecordsQueryHandler(IUnitOfWork uow) { _uow = uow; }
    public async Task<List<UsageRecordDto>> Handle(GetUsageRecordsQuery request, CancellationToken ct)
    {
        var query = _uow.Repository<UsageRecord>().Query()
            .Where(r => r.UserId == request.UserId);
        if (request.Days.HasValue && request.Days.Value > 0)
            query = query.Where(r => r.CreatedAt >= DateTime.UtcNow.AddDays(-request.Days.Value));
        if (request.ApiKeyId.HasValue)
            query = query.Where(r => r.ApiKeyId == request.ApiKeyId.Value);
        return await query
            .OrderByDescending(r => r.CreatedAt)
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(r => request.IncludeContent
                ? new UsageRecordDto(r.Id, r.ModelName, r.ProviderName, r.PromptTokens, r.CompletionTokens, r.TotalTokens, r.Cost, r.LatencyMs, r.IsSuccess, r.ErrorMessage, r.RequestContent, r.ResponseContent, r.IpAddress, r.RequestSize, r.ResponseSize, DateTime.SpecifyKind(r.CreatedAt, DateTimeKind.Utc))
                : new UsageRecordDto(r.Id, r.ModelName, r.ProviderName, r.PromptTokens, r.CompletionTokens, r.TotalTokens, r.Cost, r.LatencyMs, r.IsSuccess, r.ErrorMessage, null, null, r.IpAddress, r.RequestSize, r.ResponseSize, DateTime.SpecifyKind(r.CreatedAt, DateTimeKind.Utc)))
            .ToListAsync(ct);
    }
}
