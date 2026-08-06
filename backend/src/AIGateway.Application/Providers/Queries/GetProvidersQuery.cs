using MediatR; using AIGateway.Application.DTOs; using AIGateway.Domain.Interfaces; using AIGateway.Domain.Entities; using Microsoft.EntityFrameworkCore;
namespace AIGateway.Application.Providers.Queries;
public record GetProvidersQuery : IRequest<IEnumerable<ProviderDto>>;
public class GetProvidersQueryHandler : IRequestHandler<GetProvidersQuery, IEnumerable<ProviderDto>>
{
    private readonly IUnitOfWork _uow;
    public GetProvidersQueryHandler(IUnitOfWork uow) { _uow = uow; }
    public async Task<IEnumerable<ProviderDto>> Handle(GetProvidersQuery request, CancellationToken ct)
    {
        var providers = await _uow.Repository<Provider>().Query().Include(p => p.Models).Include(p => p.ApiKeys).ToListAsync(ct);
        return providers.Select(p => new ProviderDto(
            p.Id, p.Name, p.Type, p.BaseUrl, p.IsActive, p.Priority, p.RateLimit, p.CreatedAt, p.ApiKeyExpiresAt,
            p.Headers, p.AuthType, p.BodyTemplate, p.ResponseTemplate, p.ErrorTemplate,
            p.Models.Select(m => new ModelDto(m.Id, m.Name, m.DisplayName, m.ProviderId, p.Name, m.ContextWindow, m.MaxTokens, m.SupportsStreaming, m.Status.ToString(), m.ActualModelName, m.IsFree, m.TpmLimit, m.TpdLimit, m.RpmLimit, m.MaxConcurrency,
                m.PricePerPromptToken.HasValue ? m.PricePerPromptToken.Value * 1000m : null,
                m.PricePerCompletionToken.HasValue ? m.PricePerCompletionToken.Value * 1000m : null)).ToList(),
            p.ChatEndpointPath,
            p.ApiKeys.Select(ProviderKeyMapper.ToDto).ToList()));
    }
}
