using MediatR; using AIGateway.Application.DTOs; using AIGateway.Domain.Interfaces; using AIGateway.Domain.Entities; using Microsoft.EntityFrameworkCore;
namespace AIGateway.Application.ApiKeys.Queries;
public record GetApiKeysQuery(Guid UserId) : IRequest<IEnumerable<ApiKeyDto>>;
public class GetApiKeysQueryHandler : IRequestHandler<GetApiKeysQuery, IEnumerable<ApiKeyDto>>
{
    private readonly IUnitOfWork _uow;
    public GetApiKeysQueryHandler(IUnitOfWork uow) { _uow = uow; }
    public async Task<IEnumerable<ApiKeyDto>> Handle(GetApiKeysQuery request, CancellationToken ct)
    {
        var keys = await _uow.Repository<ApiKey>().Query().Where(k => k.UserId == request.UserId).ToListAsync(ct);
        var costByKey = await _uow.Repository<UsageRecord>().Query()
            .Where(r => r.UserId == request.UserId && r.ApiKeyId.HasValue)
            .GroupBy(r => r.ApiKeyId!.Value)
            .Select(g => new { KeyId = g.Key, Cost = g.Sum(r => (decimal?)r.Cost ?? 0) })
            .ToListAsync(ct);
        var costMap = costByKey.ToDictionary(x => x.KeyId, x => x.Cost);
        return keys.Select(k => new ApiKeyDto(k.Id, k.Prefix, k.Name, k.Status.ToString(), k.ExpiresAt, k.UsedTokens, k.CreatedAt, costMap.GetValueOrDefault(k.Id), k.RestrictToActiveModels, k.AllowedModelIds));
    }
}
