using MediatR; using AIGateway.Application.DTOs; using AIGateway.Domain.Interfaces; using AIGateway.Domain.Entities;
using Microsoft.EntityFrameworkCore;
namespace AIGateway.Application.Models.Commands;
public record ImportModelsCommand(Guid ProviderId, List<CreateModelDto> Models) : IRequest<ImportModelsResultDto>;
public class ImportModelsCommandHandler : IRequestHandler<ImportModelsCommand, ImportModelsResultDto>
{
    private readonly IUnitOfWork _uow;
    public ImportModelsCommandHandler(IUnitOfWork uow) { _uow = uow; }
    public async Task<ImportModelsResultDto> Handle(ImportModelsCommand request, CancellationToken ct)
    {
        var provider = await _uow.Repository<Provider>().GetByIdAsync(request.ProviderId);
        if (provider == null) throw new KeyNotFoundException("Provider not found");

        var repo = _uow.Repository<AIModel>();
        var existing = await repo.Query()
            .Where(m => m.ProviderId == request.ProviderId)
            .Select(m => m.Name)
            .ToListAsync(ct);
        var names = new HashSet<string>(existing, StringComparer.OrdinalIgnoreCase);

        var takenActuals = await repo.Query()
            .Where(m => m.ActualModelName != null)
            .Select(m => m.ActualModelName!)
            .ToListAsync(ct);
        var actualNames = new HashSet<string>(takenActuals, StringComparer.OrdinalIgnoreCase);

        var failed = new List<string>();
        var added = 0;
        var skipped = 0;
        foreach (var dto in request.Models)
        {
            if (string.IsNullOrWhiteSpace(dto.Name)) { failed.Add("(missing name)"); continue; }
            if (names.Contains(dto.Name)) { skipped++; continue; }

            try
            {
                var model = new AIModel
                {
                    Name = dto.Name,
                    DisplayName = dto.DisplayName,
                    ActualModelName = dto.ActualModelName,
                    AlternativeModelName = dto.AlternativeModelName ?? (dto.ActualModelName != null && actualNames.Contains(dto.ActualModelName) ? $"{dto.ActualModelName}@{provider.Name}" : null),
                    ProviderId = request.ProviderId,
                    ContextWindow = dto.ContextWindow,
                    MaxTokens = dto.MaxTokens,
                    SupportsImages = dto.SupportsImages,
                    SupportsVision = dto.SupportsVision,
                    SupportsAudio = dto.SupportsAudio,
                    SupportsFunctionCalling = dto.SupportsFunctionCalling,
                    SupportsStreaming = dto.SupportsStreaming,
                    IsFree = dto.IsFree,
                    TpmLimit = dto.TpmLimit,
                    TpdLimit = dto.TpdLimit,
                    RpmLimit = dto.RpmLimit,
                    MaxConcurrency = dto.MaxConcurrency,
                    PricePerPromptToken = dto.PricePer1kInput.HasValue ? dto.PricePer1kInput.Value / 1000m : null,
                    PricePerCompletionToken = dto.PricePer1kOutput.HasValue ? dto.PricePer1kOutput.Value / 1000m : null,
                };
                await repo.AddAsync(model);
                names.Add(dto.Name);
                if (dto.ActualModelName != null) actualNames.Add(dto.ActualModelName);
                added++;
            }
            catch (Exception ex)
            {
                failed.Add($"{dto.Name}: {ex.Message}");
            }
        }
        await _uow.SaveChangesAsync();
        return new ImportModelsResultDto(added, skipped, failed);
    }
}