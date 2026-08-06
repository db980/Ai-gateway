using MediatR;
using AIGateway.Domain.Entities;
using AIGateway.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace AIGateway.Application.Providers.Commands;

public record DeleteProviderKeyCommand(Guid ProviderId, Guid KeyId) : IRequest<Unit>;

public class DeleteProviderKeyCommandHandler : IRequestHandler<DeleteProviderKeyCommand, Unit>
{
    private readonly IUnitOfWork _uow;
    public DeleteProviderKeyCommandHandler(IUnitOfWork uow) { _uow = uow; }

    public async Task<Unit> Handle(DeleteProviderKeyCommand request, CancellationToken ct)
    {
        var provider = await _uow.Repository<Provider>().Query().Include(p => p.ApiKeys).FirstOrDefaultAsync(p => p.Id == request.ProviderId, ct);
        if (provider == null) throw new KeyNotFoundException("Provider not found");
        var target = provider.ApiKeys.FirstOrDefault(k => k.Id == request.KeyId);
        if (target == null) throw new KeyNotFoundException("API key not found");

        var wasActive = target.IsActive;
        provider.ApiKeys.Remove(target);
        await _uow.Repository<ProviderApiKey>().DeleteAsync(target);

        if (provider.ApiKeys.Count == 0)
        {
            provider.ApiKey = null;
            provider.ApiKeyExpiresAt = null;
        }
        else if (wasActive)
        {
            var promoted = provider.ApiKeys.OrderBy(k => k.CreatedAt).First();
            foreach (var k in provider.ApiKeys) k.IsActive = false;
            promoted.IsActive = true;
            provider.ApiKey = promoted.KeyValue;
            provider.ApiKeyExpiresAt = promoted.ExpiresAt;
        }
        provider.UpdatedAt = DateTime.UtcNow;
        await _uow.SaveChangesAsync();
        return Unit.Value;
    }
}
