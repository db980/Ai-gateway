using AIGateway.Domain.Enums;
namespace AIGateway.Application.DTOs;
public record CreateModelDto(
    string Name, string? DisplayName, Guid ProviderId, int? ContextWindow, int? MaxTokens,
    bool SupportsImages = false, bool SupportsVision = false, bool SupportsAudio = false,
    bool SupportsFunctionCalling = false, bool SupportsStreaming = true, string? ActualModelName = null,
    bool IsFree = false, long? TpmLimit = null, long? TpdLimit = null, int? RpmLimit = null, int? MaxConcurrency = null,
    decimal? PricePer1kInput = null, decimal? PricePer1kOutput = null, string? AlternativeModelName = null, string? Location = null);
public record ModelDto(
    Guid Id, string Name, string? DisplayName, Guid ProviderId, string ProviderName,
    int? ContextWindow, int? MaxTokens, bool SupportsStreaming, string Status, string? ActualModelName = null,
    bool IsFree = false, long? TpmLimit = null, long? TpdLimit = null, int? RpmLimit = null, int? MaxConcurrency = null,
    decimal? PricePer1kInput = null, decimal? PricePer1kOutput = null, string? AlternativeModelName = null, string? Location = null);
public record UpdateModelDto(
    string? Name, string? DisplayName, int? ContextWindow, int? MaxTokens,
    bool? SupportsImages, bool? SupportsVision, bool? SupportsStreaming, string? Status, string? ActualModelName = null,
    bool? IsFree = null, long? TpmLimit = null, long? TpdLimit = null, int? RpmLimit = null, int? MaxConcurrency = null,
    decimal? PricePer1kInput = null, decimal? PricePer1kOutput = null, string? AlternativeModelName = null, string? Location = null);
public record UpdateAllModelsPricingDto(decimal? PricePer1kInput = null, decimal? PricePer1kOutput = null, bool IncludeFree = true);
public record ImportModelsRequestDto(Guid ProviderId, List<CreateModelDto> Models);
public record ImportModelsResultDto(int Added, int Skipped, List<string> Failed);
public record BulkModelTestRequestDto(Guid[]? ModelIds = null);
public record BulkModelTestItemDto(Guid ModelId, string ModelName, bool Success, string? Message, long LatencyMs, string Status);