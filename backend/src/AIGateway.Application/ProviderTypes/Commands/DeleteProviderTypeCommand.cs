using MediatR; using AIGateway.Domain.Interfaces; using AIGateway.Domain.Entities;
namespace AIGateway.Application.ProviderTypes.Commands;
public record DeleteProviderTypeCommand(Guid Id) : IRequest;
public class DeleteProviderTypeCommandHandler : IRequestHandler<DeleteProviderTypeCommand>
{
    private readonly IUnitOfWork _uow;
    public DeleteProviderTypeCommandHandler(IUnitOfWork uow) { _uow = uow; }
    public async Task Handle(DeleteProviderTypeCommand request, CancellationToken ct)
    {
        var entity = await _uow.Repository<ProviderType>().GetByIdAsync(request.Id);
        if (entity == null) throw new KeyNotFoundException("Provider type not found");
        await _uow.Repository<ProviderType>().DeleteAsync(entity);
        await _uow.SaveChangesAsync();
    }
}