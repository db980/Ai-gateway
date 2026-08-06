using MediatR; using AIGateway.Application.DTOs; using AIGateway.Domain.Interfaces; using AIGateway.Domain.Entities; using AIGateway.Domain.Enums; using System.Security.Cryptography;
namespace AIGateway.Application.ApiKeys.Commands;
public record CreateApiKeyCommand(Guid UserId, string? Name, DateTime? ExpiresAt, string? IpWhitelist, int? RateLimit, long? Quota, bool RestrictToActiveModels = false) : IRequest<ApiKeyFullDto>;
public class CreateApiKeyCommandHandler : IRequestHandler<CreateApiKeyCommand, ApiKeyFullDto>
{
    private readonly IUnitOfWork _uow;
    public CreateApiKeyCommandHandler(IUnitOfWork uow) { _uow = uow; }
    public async Task<ApiKeyFullDto> Handle(CreateApiKeyCommand request, CancellationToken ct)
    {
        var keyBytes = RandomNumberGenerator.GetBytes(32);
        var key = $"sk_live_{Convert.ToHexString(keyBytes).ToLowerInvariant()}";
        var prefix = key[..15];
        var apiKey = new ApiKey { UserId = request.UserId, Key = key, Prefix = prefix, Name = request.Name, Status = ApiKeyStatus.Active, ExpiresAt = request.ExpiresAt, IpWhitelist = request.IpWhitelist, RateLimit = request.RateLimit, Quota = request.Quota, RestrictToActiveModels = request.RestrictToActiveModels };
        await _uow.Repository<ApiKey>().AddAsync(apiKey);
        await _uow.SaveChangesAsync();
        return new ApiKeyFullDto(apiKey.Id, apiKey.Key, apiKey.Prefix, apiKey.Name, apiKey.Status.ToString(), apiKey.ExpiresAt, apiKey.IpWhitelist, apiKey.RateLimit, apiKey.Quota, apiKey.UsedTokens, apiKey.CreatedAt, apiKey.RestrictToActiveModels, null);
    }
}
