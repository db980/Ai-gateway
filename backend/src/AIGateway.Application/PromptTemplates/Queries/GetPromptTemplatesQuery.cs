using MediatR; using AIGateway.Application.DTOs; using AIGateway.Domain.Interfaces; using AIGateway.Domain.Entities; using Microsoft.EntityFrameworkCore;
namespace AIGateway.Application.PromptTemplates.Queries;
public record GetPromptTemplatesQuery(Guid UserId) : IRequest<IEnumerable<PromptTemplateDto>>;
public class GetPromptTemplatesQueryHandler : IRequestHandler<GetPromptTemplatesQuery, IEnumerable<PromptTemplateDto>>
{
    private readonly IUnitOfWork _uow;
    public GetPromptTemplatesQueryHandler(IUnitOfWork uow) { _uow = uow; }
    public async Task<IEnumerable<PromptTemplateDto>> Handle(GetPromptTemplatesQuery request, CancellationToken ct)
    {
        return await _uow.Repository<PromptTemplate>().Query().Where(t => t.UserId == request.UserId || t.IsPublic).Select(t => new PromptTemplateDto(t.Id, t.Name, t.Content, t.Category, t.Tags, t.IsFavorite, t.IsPublic, t.CreatedAt)).ToListAsync(ct);
    }
}
