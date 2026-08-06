using MediatR; using AIGateway.Application.DTOs; using AIGateway.Domain.Interfaces; using AIGateway.Domain.Entities;
namespace AIGateway.Application.Providers.Commands;
public record CreateProviderCommand(
    string Name, string BaseUrl, string? ApiKey = null, DateTime? ApiKeyExpiresAt = null, string? Organization = null,
    int? RateLimit = null, int? Timeout = null, bool IsActive = true, int Priority = 0,
    string? Headers = null, string? AuthType = null, string? Type = null,
    string? BodyTemplate = null, string? ResponseTemplate = null, string? ErrorTemplate = null,
    List<CreateModelDto>? Models = null, string? ChatEndpointPath = null, List<AddProviderKeyDto>? ApiKeys = null) : IRequest<ProviderDto>;
public class CreateProviderCommandHandler : IRequestHandler<CreateProviderCommand, ProviderDto>
{
    private readonly IUnitOfWork _uow;
    public CreateProviderCommandHandler(IUnitOfWork uow) { _uow = uow; }
    public async Task<ProviderDto> Handle(CreateProviderCommand request, CancellationToken ct)
    {
        var provider = new Provider
        {
            Name = request.Name,
            Type = request.Type ?? "CustomRESTAPI",
            BaseUrl = request.BaseUrl,
            ApiKey = request.ApiKey,
            ApiKeyExpiresAt = request.ApiKeyExpiresAt,
            Organization = request.Organization,
            RateLimit = request.RateLimit,
            Timeout = request.Timeout,
            IsActive = request.IsActive,
            Priority = request.Priority,
            Headers = request.Headers,
            AuthType = request.AuthType,
            BodyTemplate = request.BodyTemplate,
            ResponseTemplate = request.ResponseTemplate,
            ErrorTemplate = request.ErrorTemplate,
            ChatEndpointPath = request.ChatEndpointPath ?? "chat/completions",
        };
        if (request.Models != null)
        {
            foreach (var m in request.Models)
            {
                provider.Models.Add(new AIModel
                {
                    Name = m.Name,
                    DisplayName = m.DisplayName,
                    ActualModelName = m.ActualModelName,
                    ContextWindow = m.ContextWindow,
                    MaxTokens = m.MaxTokens,
                    SupportsImages = m.SupportsImages,
                    SupportsVision = m.SupportsVision,
                    SupportsAudio = m.SupportsAudio,
                    SupportsFunctionCalling = m.SupportsFunctionCalling,
                    SupportsStreaming = m.SupportsStreaming,
                    IsFree = m.IsFree,
                });
            }
        }
        if (request.ApiKeys is { Count: > 0 })
        {
            foreach (var k in request.ApiKeys)
            {
                if (string.IsNullOrWhiteSpace(k.KeyValue)) continue;
                provider.ApiKeys.Add(new ProviderApiKey
                {
                    Id = Guid.NewGuid(),
                    KeyValue = k.KeyValue.Trim(),
                    Name = k.Name,
                    ExpiresAt = k.ExpiresAt,
                    IsActive = provider.ApiKeys.Count == 0,
                    CreatedAt = DateTime.UtcNow
                });
            }
            var first = provider.ApiKeys.FirstOrDefault(k => k.IsActive);
            if (first != null)
            {
                provider.ApiKey = first.KeyValue;
                provider.ApiKeyExpiresAt = first.ExpiresAt;
            }
        }
        else if (!string.IsNullOrWhiteSpace(request.ApiKey))
        {
            provider.ApiKeys.Add(new ProviderApiKey
            {
                Id = Guid.NewGuid(),
                KeyValue = request.ApiKey.Trim(),
                Name = request.Name,
                ExpiresAt = request.ApiKeyExpiresAt,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            });
        }
        await _uow.Repository<Provider>().AddAsync(provider);
        await _uow.SaveChangesAsync();
        return new ProviderDto(
            provider.Id, provider.Name, provider.Type, provider.BaseUrl,
            provider.IsActive, provider.Priority, provider.RateLimit, provider.CreatedAt, provider.ApiKeyExpiresAt,
            provider.Headers, provider.AuthType, provider.BodyTemplate, provider.ResponseTemplate, provider.ErrorTemplate,
            provider.Models.Select(m => new ModelDto(m.Id, m.Name, m.DisplayName, m.ProviderId, provider.Name, m.ContextWindow, m.MaxTokens, m.SupportsStreaming, m.Status.ToString(), m.ActualModelName, m.IsFree, m.TpmLimit, m.TpdLimit, m.RpmLimit, m.MaxConcurrency)).ToList(),
            provider.ChatEndpointPath,
            provider.ApiKeys.Select(ProviderKeyMapper.ToDto).ToList());
    }
}