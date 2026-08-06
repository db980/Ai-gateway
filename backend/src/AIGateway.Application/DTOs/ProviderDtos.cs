namespace AIGateway.Application.DTOs;
public record CreateProviderDto(
    string Name, string BaseUrl, string? ApiKey = null, DateTime? ApiKeyExpiresAt = null, string? Organization = null,
    int? RateLimit = null, int? Timeout = null, bool IsActive = true, int Priority = 0,
    string? Headers = null, string? AuthType = null, string? Type = null,
    string? BodyTemplate = null, string? ResponseTemplate = null, string? ErrorTemplate = null,
    List<CreateModelDto>? Models = null, string? ChatEndpointPath = null, List<AddProviderKeyDto>? ApiKeys = null);
public record UpdateProviderDto(
    string? Name, string? Type, string? BaseUrl, string? ApiKey, DateTime? ApiKeyExpiresAt, string? Organization,
    int? RateLimit, int? Timeout, bool? IsActive, int? Priority,
    string? Headers = null, string? AuthType = null,
    string? BodyTemplate = null, string? ResponseTemplate = null, string? ErrorTemplate = null,
    List<CreateModelDto>? Models = null, List<Guid>? RemoveModelIds = null, string? ChatEndpointPath = null);
public record ProviderDto(
    Guid Id, string Name, string Type, string BaseUrl, bool IsActive, int Priority, int? RateLimit,
    DateTime CreatedAt, DateTime? ApiKeyExpiresAt = null,
    string? Headers = null, string? AuthType = null,
    string? BodyTemplate = null, string? ResponseTemplate = null, string? ErrorTemplate = null,
    List<ModelDto>? Models = null, string? ChatEndpointPath = null, List<ProviderApiKeyDto>? ApiKeys = null);
public record ProviderApiKeyDto(
    Guid Id, string KeyValue, string? Name, DateTime? ExpiresAt, bool IsActive, DateTime CreatedAt);
public record AddProviderKeyDto(
    string KeyValue, string? Name = null, DateTime? ExpiresAt = null, bool? IsActive = null);
public record SetKeyActiveDto(bool IsActive);