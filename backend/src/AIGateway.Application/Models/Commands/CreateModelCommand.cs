using MediatR; using AIGateway.Application.DTOs; using AIGateway.Domain.Interfaces; using AIGateway.Domain.Entities;
namespace AIGateway.Application.Models.Commands;
public record CreateModelCommand(
    string Name, string? DisplayName, Guid ProviderId, int? ContextWindow, int? MaxTokens,
    bool SupportsImages = false, bool SupportsVision = false, bool SupportsAudio = false,
    bool SupportsFunctionCalling = false, bool SupportsStreaming = true, string? ActualModelName = null,
    bool IsFree = false, long? TpmLimit = null, long? TpdLimit = null, int? RpmLimit = null, int? MaxConcurrency = null,
    decimal? PricePer1kInput = null, decimal? PricePer1kOutput = null, string? AlternativeModelName = null, string? Location = null) : IRequest<ModelDto>;
public class CreateModelCommandHandler : IRequestHandler<CreateModelCommand, ModelDto>
{
    private readonly IUnitOfWork _uow;
    public CreateModelCommandHandler(IUnitOfWork uow) { _uow = uow; }
    public async Task<ModelDto> Handle(CreateModelCommand request, CancellationToken ct)
    {
        var provider = await _uow.Repository<Provider>().GetByIdAsync(request.ProviderId);
        if (provider == null) throw new KeyNotFoundException("Provider not found");
        var model = new AIModel
        {
            Name = request.Name,
            DisplayName = request.DisplayName,
            ActualModelName = request.ActualModelName,
            AlternativeModelName = request.AlternativeModelName,
            Location = request.Location,
            ProviderId = request.ProviderId,
            ContextWindow = request.ContextWindow,
            MaxTokens = request.MaxTokens,
            SupportsImages = request.SupportsImages,
            SupportsVision = request.SupportsVision,
            SupportsAudio = request.SupportsAudio,
            SupportsFunctionCalling = request.SupportsFunctionCalling,
            SupportsStreaming = request.SupportsStreaming,
            IsFree = request.IsFree,
            TpmLimit = request.TpmLimit,
            TpdLimit = request.TpdLimit,
            RpmLimit = request.RpmLimit,
            MaxConcurrency = request.MaxConcurrency,
            PricePerPromptToken = request.PricePer1kInput.HasValue ? request.PricePer1kInput.Value / 1000m : null,
            PricePerCompletionToken = request.PricePer1kOutput.HasValue ? request.PricePer1kOutput.Value / 1000m : null,
        };
        await _uow.Repository<AIModel>().AddAsync(model);
        await _uow.SaveChangesAsync();
        return new ModelDto(
            model.Id, model.Name, model.DisplayName, provider.Id, provider.Name,
            model.ContextWindow, model.MaxTokens, model.SupportsStreaming, model.Status.ToString(),
            model.ActualModelName, model.IsFree, model.TpmLimit, model.TpdLimit, model.RpmLimit, model.MaxConcurrency,
            model.PricePerPromptToken.HasValue ? model.PricePerPromptToken.Value * 1000m : null,
            model.PricePerCompletionToken.HasValue ? model.PricePerCompletionToken.Value * 1000m : null,
            model.AlternativeModelName, model.Location);
    }
}