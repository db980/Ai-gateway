using MediatR; using AIGateway.Application.DTOs; using AIGateway.Domain.Interfaces; using AIGateway.Domain.Entities;
namespace AIGateway.Application.PromptTemplates.Commands;
public record CreatePromptTemplateCommand(Guid UserId, string Name, string Content, string? Category, string? Tags, bool IsPublic = false) : IRequest<PromptTemplateDto>;
public class CreatePromptTemplateCommandHandler : IRequestHandler<CreatePromptTemplateCommand, PromptTemplateDto>
{
    private readonly IUnitOfWork _uow;
    public CreatePromptTemplateCommandHandler(IUnitOfWork uow) { _uow = uow; }
    public async Task<PromptTemplateDto> Handle(CreatePromptTemplateCommand request, CancellationToken ct)
    {
        var t = new PromptTemplate { UserId = request.UserId, Name = request.Name, Content = request.Content, Category = request.Category, Tags = request.Tags, IsPublic = request.IsPublic };
        await _uow.Repository<PromptTemplate>().AddAsync(t);
        await _uow.SaveChangesAsync();
        return new PromptTemplateDto(t.Id, t.Name, t.Content, t.Category, t.Tags, t.IsFavorite, t.IsPublic, t.CreatedAt);
    }
}
