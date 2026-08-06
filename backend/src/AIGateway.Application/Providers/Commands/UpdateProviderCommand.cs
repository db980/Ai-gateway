using MediatR; using AIGateway.Application.DTOs; using AIGateway.Domain.Interfaces; using AIGateway.Domain.Entities; using Microsoft.EntityFrameworkCore;
namespace AIGateway.Application.Providers.Commands;
public record UpdateProviderCommand(
    Guid Id, string? Name, string? Type, string? BaseUrl, string? ApiKey, DateTime? ApiKeyExpiresAt, string? Organization,
    int? RateLimit, int? Timeout, bool? IsActive, int? Priority,
    string? Headers = null, string? AuthType = null,
    string? BodyTemplate = null, string? ResponseTemplate = null, string? ErrorTemplate = null,
    List<CreateModelDto>? Models = null, List<Guid>? RemoveModelIds = null, string? ChatEndpointPath = null) : IRequest<ProviderDto>;
public class UpdateProviderCommandHandler : IRequestHandler<UpdateProviderCommand, ProviderDto>
{
    private readonly IUnitOfWork _uow;
    public UpdateProviderCommandHandler(IUnitOfWork uow) { _uow = uow; }
    public async Task<ProviderDto> Handle(UpdateProviderCommand request, CancellationToken ct)
    {
        var provider = await _uow.Repository<Provider>().Query().Include(p => p.ApiKeys).FirstOrDefaultAsync(p => p.Id == request.Id, ct);
        if (provider == null) throw new KeyNotFoundException("Provider not found");
        if (request.Name != null) provider.Name = request.Name;
        if (request.Type != null) provider.Type = request.Type;
        if (request.BaseUrl != null) provider.BaseUrl = request.BaseUrl;
        if (request.ApiKey != null)
        {
            var newKey = request.ApiKey.Trim();
            if (newKey.Length > 0 && !provider.ApiKeys.Any(k => k.KeyValue == newKey && k.IsActive))
            {
                foreach (var k in provider.ApiKeys) k.IsActive = false;
                provider.ApiKeys.Add(new ProviderApiKey
                {
                    Id = Guid.NewGuid(),
                    KeyValue = newKey,
                    Name = request.Name,
                    ExpiresAt = request.ApiKeyExpiresAt,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                });
                provider.ApiKey = newKey;
            }
        }
        if (request.ApiKeyExpiresAt != null) provider.ApiKeyExpiresAt = request.ApiKeyExpiresAt;
        if (request.Organization != null) provider.Organization = request.Organization;
        if (request.RateLimit.HasValue) provider.RateLimit = request.RateLimit;
        if (request.Timeout.HasValue) provider.Timeout = request.Timeout;
        if (request.IsActive.HasValue) provider.IsActive = request.IsActive.Value;
        if (request.Priority.HasValue) provider.Priority = request.Priority.Value;
        if (request.Headers != null) provider.Headers = request.Headers;
        if (request.AuthType != null) provider.AuthType = request.AuthType;
        if (request.BodyTemplate != null) provider.BodyTemplate = request.BodyTemplate;
        if (request.ResponseTemplate != null) provider.ResponseTemplate = request.ResponseTemplate;
        if (request.ErrorTemplate != null) provider.ErrorTemplate = request.ErrorTemplate;
        if (request.ChatEndpointPath != null) provider.ChatEndpointPath = request.ChatEndpointPath;
        provider.UpdatedAt = DateTime.UtcNow;
        if (request.RemoveModelIds != null)
        {
            var toRemove = provider.Models.Where(m => request.RemoveModelIds.Contains(m.Id)).ToList();
            foreach (var m in toRemove)
            {
                provider.Models.Remove(m);
                await _uow.Repository<AIModel>().DeleteAsync(m);
            }
        }
        if (request.Models != null)
        {
            foreach (var m in request.Models)
            {
                provider.Models.Add(new AIModel
                {
                    ProviderId = provider.Id,
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
        await _uow.Repository<Provider>().UpdateAsync(provider);
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
