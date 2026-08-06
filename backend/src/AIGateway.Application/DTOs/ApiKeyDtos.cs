namespace AIGateway.Application.DTOs;
public record CreateApiKeyDto(string? Name, DateTime? ExpiresAt, string? IpWhitelist, int? RateLimit, long? Quota, bool RestrictToActiveModels = false);
public record ApiKeyDto(Guid Id, string Prefix, string? Name, string Status, DateTime? ExpiresAt, long UsedTokens, DateTime CreatedAt, decimal? Cost, bool RestrictToActiveModels, string? AllowedModelIds);
public record ApiKeyFullDto(Guid Id, string Key, string Prefix, string? Name, string Status, DateTime? ExpiresAt, string? IpWhitelist, int? RateLimit, long? Quota, long UsedTokens, DateTime CreatedAt, bool RestrictToActiveModels, string? AllowedModelIds);
public record SetAllowedModelsDto(string[]? ModelIds);
