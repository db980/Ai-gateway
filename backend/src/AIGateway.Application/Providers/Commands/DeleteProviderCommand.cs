using MediatR; using AIGateway.Domain.Interfaces; using AIGateway.Domain.Entities; using Microsoft.EntityFrameworkCore;
namespace AIGateway.Application.Providers.Commands;
public record DeleteProviderCommand(Guid Id) : IRequest;
public class DeleteProviderCommandHandler : IRequestHandler<DeleteProviderCommand>
{
    private readonly IUnitOfWork _uow;
    public DeleteProviderCommandHandler(IUnitOfWork uow) { _uow = uow; }
    public async Task Handle(DeleteProviderCommand request, CancellationToken ct)
    {
        var provider = await _uow.Repository<Provider>().Query()
            .Include(p => p.Models)
            .FirstOrDefaultAsync(p => p.Id == request.Id, ct);
        if (provider == null) throw new KeyNotFoundException("Provider not found");
        foreach (var m in provider.Models.ToList())
            await _uow.Repository<AIModel>().DeleteAsync(m);
        await _uow.Repository<Provider>().DeleteAsync(provider);
        await _uow.SaveChangesAsync();
    }
}