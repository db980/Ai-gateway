using MediatR;
using AIGateway.Application.DTOs;
using AIGateway.Domain.Entities;
using AIGateway.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace AIGateway.Application.Providers.Commands;

public record AddProviderKeyCommand(Guid ProviderId, string KeyValue, string? Name = null, DateTime? ExpiresAt = null, bool? IsActive = null) : IRequest<ProviderApiKeyDto>;

public class AddProviderKeyCommandHandler : IRequestHandler<AddProviderKeyCommand, ProviderApiKeyDto>
{
    private readonly IUnitOfWork _uow;
    public AddProviderKeyCommandHandler(IUnitOfWork uow) { _uow = uow; }

    public async Task<ProviderApiKeyDto> Handle(AddProviderKeyCommand request, CancellationToken ct)
    {
        var provider = await _uow.Repository<Provider>().Query().Include(p => p.ApiKeys).FirstOrDefaultAsync(p => p.Id == request.ProviderId, ct);
        if (provider == null) throw new KeyNotFoundException("Provider not found");
        if (string.IsNullOrWhiteSpace(request.KeyValue)) throw new InvalidOperationException("API key cannot be empty");

        var makeActive = request.IsActive ?? true;
        var key = new ProviderApiKey
        {
            Id = Guid.NewGuid(),
            ProviderId = provider.Id,
            KeyValue = request.KeyValue.Trim(),
            Name = request.Name,
            ExpiresAt = request.ExpiresAt,
            IsActive = makeActive,
            CreatedAt = DateTime.UtcNow
        };
        if (makeActive)
        {
            foreach (var k in provider.ApiKeys) k.IsActive = false;
            provider.ApiKey = key.KeyValue;
            provider.ApiKeyExpiresAt = key.ExpiresAt;
        }
        await _uow.Repository<ProviderApiKey>().AddAsync(key);
        provider.UpdatedAt = DateTime.UtcNow;
        await _uow.SaveChangesAsync();
        return ProviderKeyMapper.ToDto(key);
    }
}
