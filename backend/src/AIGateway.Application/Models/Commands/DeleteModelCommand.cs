using MediatR; using AIGateway.Domain.Interfaces; using AIGateway.Domain.Entities;
namespace AIGateway.Application.Models.Commands;
public record DeleteModelCommand(Guid Id) : IRequest;
public class DeleteModelCommandHandler : IRequestHandler<DeleteModelCommand>
{
    private readonly IUnitOfWork _uow;
    public DeleteModelCommandHandler(IUnitOfWork uow) { _uow = uow; }
    public async Task Handle(DeleteModelCommand request, CancellationToken ct)
    {
        var model = await _uow.Repository<AIModel>().GetByIdAsync(request.Id);
        if (model == null) throw new KeyNotFoundException("Model not found");
        await _uow.Repository<AIModel>().DeleteAsync(model);
        await _uow.SaveChangesAsync();
    }
}