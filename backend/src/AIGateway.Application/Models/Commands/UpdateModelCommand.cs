using MediatR; using AIGateway.Application.DTOs; using AIGateway.Domain.Interfaces; using AIGateway.Domain.Entities; using AIGateway.Domain.Enums;
namespace AIGateway.Application.Models.Commands;
public record UpdateModelCommand(
    Guid Id, string? Name, string? DisplayName, int? ContextWindow, int? MaxTokens,
    bool? SupportsImages, bool? SupportsVision, bool? SupportsStreaming, string? Status, string? ActualModelName = null,
    bool? IsFree = null, long? TpmLimit = null, long? TpdLimit = null, int? RpmLimit = null, int? MaxConcurrency = null,
    decimal? PricePer1kInput = null, decimal? PricePer1kOutput = null, string? AlternativeModelName = null, string? Location = null) : IRequest<ModelDto>;
public class UpdateModelCommandHandler : IRequestHandler<UpdateModelCommand, ModelDto>
{
    private readonly IUnitOfWork _uow;
    public UpdateModelCommandHandler(IUnitOfWork uow) { _uow = uow; }
    public async Task<ModelDto> Handle(UpdateModelCommand request, CancellationToken ct)
    {
        var model = await _uow.Repository<AIModel>().GetByIdAsync(request.Id);
        if (model == null) throw new KeyNotFoundException("Model not found");
        if (request.Name != null) model.Name = request.Name;
        if (request.DisplayName != null) model.DisplayName = request.DisplayName;
        if (request.ContextWindow.HasValue) model.ContextWindow = request.ContextWindow;
        if (request.MaxTokens.HasValue) model.MaxTokens = request.MaxTokens;
        if (request.SupportsImages.HasValue) model.SupportsImages = request.SupportsImages.Value;
        if (request.SupportsVision.HasValue) model.SupportsVision = request.SupportsVision.Value;
        if (request.SupportsStreaming.HasValue) model.SupportsStreaming = request.SupportsStreaming.Value;
        if (request.IsFree.HasValue) model.IsFree = request.IsFree.Value;
        if (request.Status != null) model.Status = Enum.Parse<ModelStatus>(request.Status);
        if (request.ActualModelName != null) model.ActualModelName = request.ActualModelName;
        if (request.AlternativeModelName != null) model.AlternativeModelName = request.AlternativeModelName;
        if (request.Location != null) model.Location = request.Location;
        if (request.TpmLimit.HasValue) model.TpmLimit = request.TpmLimit;
        if (request.TpdLimit.HasValue) model.TpdLimit = request.TpdLimit;
        if (request.RpmLimit.HasValue) model.RpmLimit = request.RpmLimit;
        if (request.MaxConcurrency.HasValue) model.MaxConcurrency = request.MaxConcurrency;
        if (request.PricePer1kInput.HasValue) model.PricePerPromptToken = request.PricePer1kInput.Value / 1000m;
        if (request.PricePer1kOutput.HasValue) model.PricePerCompletionToken = request.PricePer1kOutput.Value / 1000m;
        await _uow.Repository<AIModel>().UpdateAsync(model);
        await _uow.SaveChangesAsync();
        var provider = await _uow.Repository<Provider>().GetByIdAsync(model.ProviderId);
        return new ModelDto(
            model.Id, model.Name, model.DisplayName, model.ProviderId, provider?.Name ?? "",
            model.ContextWindow, model.MaxTokens, model.SupportsStreaming, model.Status.ToString(),
            model.ActualModelName, model.IsFree, model.TpmLimit, model.TpdLimit, model.RpmLimit, model.MaxConcurrency,
            model.PricePerPromptToken.HasValue ? model.PricePerPromptToken.Value * 1000m : null,
            model.PricePerCompletionToken.HasValue ? model.PricePerCompletionToken.Value * 1000m : null,
            model.AlternativeModelName, model.Location);
    }
}
