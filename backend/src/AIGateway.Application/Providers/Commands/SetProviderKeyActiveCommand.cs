using MediatR;
using AIGateway.Application.DTOs;
using AIGateway.Domain.Entities;
using AIGateway.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace AIGateway.Application.Providers.Commands;

public record SetProviderKeyActiveCommand(Guid ProviderId, Guid KeyId, bool IsActive) : IRequest<ProviderApiKeyDto>;

public class SetProviderKeyActiveCommandHandler : IRequestHandler<SetProviderKeyActiveCommand, ProviderApiKeyDto>
{
    private readonly IUnitOfWork _uow;
    public SetProviderKeyActiveCommandHandler(IUnitOfWork uow) { _uow = uow; }

    public async Task<ProviderApiKeyDto> Handle(SetProviderKeyActiveCommand request, CancellationToken ct)
    {
        var provider = await _uow.Repository<Provider>().Query().Include(p => p.ApiKeys).FirstOrDefaultAsync(p => p.Id == request.ProviderId, ct);
        if (provider == null) throw new KeyNotFoundException("Provider not found");
        var target = provider.ApiKeys.FirstOrDefault(k => k.Id == request.KeyId);
        if (target == null) throw new KeyNotFoundException("API key not found");

        if (request.IsActive)
        {
            foreach (var k in provider.ApiKeys) k.IsActive = false;
            target.IsActive = true;
            provider.ApiKey = target.KeyValue;
            provider.ApiKeyExpiresAt = target.ExpiresAt;
        }
        else
        {
            target.IsActive = false;
            if (provider.ApiKeys.FirstOrDefault(k => k.IsActive) == null)
            {
                provider.ApiKey = null;
                provider.ApiKeyExpiresAt = null;
            }
        }
        provider.UpdatedAt = DateTime.UtcNow;
        await _uow.SaveChangesAsync();
        return ProviderKeyMapper.ToDto(target);
    }
}