using MediatR; using AIGateway.Application.DTOs; using AIGateway.Domain.Interfaces; using Microsoft.EntityFrameworkCore;
namespace AIGateway.Application.ProviderTypes.Queries;
public record GetProviderTypesQuery : IRequest<List<ProviderTypeDto>>;
public class GetProviderTypesQueryHandler : IRequestHandler<GetProviderTypesQuery, List<ProviderTypeDto>>
{
    private readonly IUnitOfWork _uow;
    public GetProviderTypesQueryHandler(IUnitOfWork uow) { _uow = uow; }
    public async Task<List<ProviderTypeDto>> Handle(GetProviderTypesQuery request, CancellationToken ct)
    {
        return await _uow.Repository<Domain.Entities.ProviderType>().Query()
            .OrderBy(t => t.Name)
            .Select(t => new ProviderTypeDto(t.Id, t.Name))
            .ToListAsync(ct);
    }
}