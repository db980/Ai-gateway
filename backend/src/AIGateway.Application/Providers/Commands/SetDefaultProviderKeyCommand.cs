using MediatR;
using AIGateway.Application.DTOs;
using AIGateway.Domain.Entities;
using AIGateway.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace AIGateway.Application.Providers.Commands;

public record SetDefaultProviderKeyCommand(Guid ProviderId, Guid KeyId) : IRequest<ProviderApiKeyDto>;

public class SetDefaultProviderKeyCommandHandler : IRequestHandler<SetDefaultProviderKeyCommand, ProviderApiKeyDto>
{
    private readonly IUnitOfWork _uow;
    public SetDefaultProviderKeyCommandHandler(IUnitOfWork uow) { _uow = uow; }

    public async Task<ProviderApiKeyDto> Handle(SetDefaultProviderKeyCommand request, CancellationToken ct)
    {
        var provider = await _uow.Repository<Provider>().Query().Include(p => p.ApiKeys).FirstOrDefaultAsync(p => p.Id == request.ProviderId, ct);
        if (provider == null) throw new KeyNotFoundException("Provider not found");
        var target = provider.ApiKeys.FirstOrDefault(k => k.Id == request.KeyId);
        if (target == null) throw new KeyNotFoundException("API key not found");

        foreach (var k in provider.ApiKeys) k.IsActive = false;
        target.IsActive = true;
        provider.ApiKey = target.KeyValue;
        provider.ApiKeyExpiresAt = target.ExpiresAt;
        provider.UpdatedAt = DateTime.UtcNow;
        await _uow.SaveChangesAsync();
        return ProviderKeyMapper.ToDto(target);
    }
}
