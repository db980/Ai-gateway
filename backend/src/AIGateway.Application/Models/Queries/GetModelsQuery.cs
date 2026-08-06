using MediatR; using AIGateway.Application.DTOs; using AIGateway.Domain.Interfaces; using AIGateway.Domain.Entities; using Microsoft.EntityFrameworkCore;
namespace AIGateway.Application.Models.Queries;
public record GetModelsQuery(Guid? ProviderId = null) : IRequest<IEnumerable<ModelDto>>;
public class GetModelsQueryHandler : IRequestHandler<GetModelsQuery, IEnumerable<ModelDto>>
{
    private readonly IUnitOfWork _uow;
    public GetModelsQueryHandler(IUnitOfWork uow) { _uow = uow; }
    public async Task<IEnumerable<ModelDto>> Handle(GetModelsQuery request, CancellationToken ct)
    {
        var query = _uow.Repository<AIModel>().Query().Include(m => m.Provider).AsQueryable();
        if (request.ProviderId.HasValue) query = query.Where(m => m.ProviderId == request.ProviderId);
        return await query.Select(m => new ModelDto(m.Id, m.Name, m.DisplayName, m.ProviderId, m.Provider.Name, m.ContextWindow, m.MaxTokens, m.SupportsStreaming, m.Status.ToString(), m.ActualModelName, m.IsFree, m.TpmLimit, m.TpdLimit, m.RpmLimit, m.MaxConcurrency,
            m.PricePerPromptToken.HasValue ? m.PricePerPromptToken.Value * 1000m : null,
            m.PricePerCompletionToken.HasValue ? m.PricePerCompletionToken.Value * 1000m : null,
            m.AlternativeModelName, m.Location)).ToListAsync(ct);
    }
}
