using AIGateway.Application.DTOs;
using AIGateway.Domain.Entities;

namespace AIGateway.Application.Providers;

public static class ProviderKeyMapper
{
    public static ProviderApiKeyDto ToDto(ProviderApiKey k)
    {
        var masked = k.KeyValue.Length > 8
            ? $"{k.KeyValue[..4]}...{k.KeyValue[^4..]}"
            : "****";
        return new ProviderApiKeyDto(k.Id, masked, k.Name, k.ExpiresAt, k.IsActive, k.CreatedAt);
    }
}
