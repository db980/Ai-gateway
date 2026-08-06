using MediatR; using AIGateway.Application.DTOs; using AIGateway.Domain.Interfaces;
namespace AIGateway.Application.ProviderTypes.Commands;
public record CreateProviderTypeCommand(string Name) : IRequest<ProviderTypeDto>;
public class CreateProviderTypeCommandHandler : IRequestHandler<CreateProviderTypeCommand, ProviderTypeDto>
{
    private readonly IUnitOfWork _uow;
    public CreateProviderTypeCommandHandler(IUnitOfWork uow) { _uow = uow; }
    public async Task<ProviderTypeDto> Handle(CreateProviderTypeCommand request, CancellationToken ct)
    {
        var entity = new Domain.Entities.ProviderType { Id = Guid.NewGuid(), Name = request.Name };
        await _uow.Repository<Domain.Entities.ProviderType>().AddAsync(entity);
        await _uow.SaveChangesAsync();
        return new ProviderTypeDto(entity.Id, entity.Name);
    }
}