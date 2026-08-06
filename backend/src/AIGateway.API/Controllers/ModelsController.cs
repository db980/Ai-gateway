using MediatR; using Microsoft.AspNetCore.Authorization; using Microsoft.AspNetCore.Mvc; using AIGateway.Application.DTOs; using AIGateway.Application.Interfaces; using AIGateway.Application.Models.Commands; using AIGateway.Application.Models.Queries;
using AIGateway.Domain.Interfaces; using AIGateway.Domain.Entities; using Microsoft.EntityFrameworkCore; using System.Security.Claims;
namespace AIGateway.API.Controllers;
[ApiController] [Route("api/[controller]")] [Authorize]
public class ModelsController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly IAiProviderService _aiService;
    private readonly IUnitOfWork _uow;
    private readonly ILogger<ModelsController> _logger;
    public ModelsController(IMediator mediator, IAiProviderService aiService, IUnitOfWork uow, ILogger<ModelsController> logger) { _mediator = mediator; _aiService = aiService; _uow = uow; _logger = logger; }
    [HttpGet] public async Task<ActionResult<IEnumerable<ModelDto>>> GetAll([FromQuery] Guid? providerId) => Ok(await _mediator.Send(new GetModelsQuery(providerId)));
    [HttpPost] public async Task<ActionResult<ModelDto>> Create([FromBody] CreateModelDto dto)
    {
        var result = await _mediator.Send(new CreateModelCommand(
            dto.Name, dto.DisplayName, dto.ProviderId, dto.ContextWindow, dto.MaxTokens,
            dto.SupportsImages, dto.SupportsVision, dto.SupportsAudio,
            dto.SupportsFunctionCalling, dto.SupportsStreaming, dto.ActualModelName, dto.IsFree,
            dto.TpmLimit, dto.TpdLimit, dto.RpmLimit, dto.MaxConcurrency,
            dto.PricePer1kInput, dto.PricePer1kOutput, dto.AlternativeModelName, dto.Location));
        return CreatedAtAction(nameof(GetAll), new { id = result.Id }, result);
    }
    [HttpPut("{id}")] public async Task<ActionResult<ModelDto>> Update(Guid id, [FromBody] UpdateModelDto dto)
    {
        var result = await _mediator.Send(new UpdateModelCommand(
            id, dto.Name, dto.DisplayName, dto.ContextWindow, dto.MaxTokens,
            dto.SupportsImages, dto.SupportsVision, dto.SupportsStreaming, dto.Status, dto.ActualModelName, dto.IsFree,
            dto.TpmLimit, dto.TpdLimit, dto.RpmLimit, dto.MaxConcurrency,
            dto.PricePer1kInput, dto.PricePer1kOutput, dto.AlternativeModelName, dto.Location));
        return Ok(result);
    }
    [HttpPut("pricing/bulk")] public async Task<ActionResult<int>> UpdateAllPricing([FromBody] UpdateAllModelsPricingDto dto)
    {
        var result = await _mediator.Send(new UpdateAllModelsPricingCommand(dto.PricePer1kInput, dto.PricePer1kOutput, dto.IncludeFree));
        return Ok(result);
    }
    [HttpPost("import")] public async Task<ActionResult<ImportModelsResultDto>> Import([FromBody] ImportModelsRequestDto dto)
    {
        var result = await _mediator.Send(new ImportModelsCommand(dto.ProviderId, dto.Models ?? new()));
        return Ok(result);
    }
    [HttpDelete("{id}")] public async Task<IActionResult> Delete(Guid id)
    {
        await _mediator.Send(new DeleteModelCommand(id));
        return NoContent();
    }
    [HttpPost("{id}/test")] public async Task<ActionResult<TestResult>> Test(Guid id)
    {
        var result = await _aiService.TestModelAsync(id);
        var model = await _uow.Repository<AIModel>().Query().FirstOrDefaultAsync(m => m.Id == id);
        if (model != null && model.Status != Domain.Enums.ModelStatus.Deprecated)
        {
            var status = result.Success ? "Active" : "Inactive";
            await _mediator.Send(new UpdateModelCommand(id, null, null, null, null, null, null, null, status));
            result.Status = status;
        }
        await LogTestUsage(id, result);
        return Ok(result);
    }
    [HttpPost("test-bulk")] public async Task<ActionResult<IEnumerable<BulkModelTestItemDto>>> TestBulk([FromBody] BulkModelTestRequestDto? dto)
    {
        var models = (await _mediator.Send(new GetModelsQuery())).ToList();
        if (dto?.ModelIds is { Length: > 0 })
            models = models.Where(m => dto.ModelIds.Contains(m.Id)).ToList();
        var results = new List<BulkModelTestItemDto>();
        foreach (var model in models)
        {
            var result = await _aiService.TestModelAsync(model.Id);
            var status = result.Success ? "Active" : "Inactive";
            if (model.Status != "Deprecated")
                await _mediator.Send(new UpdateModelCommand(model.Id, null, null, null, null, null, null, null, status));
            await LogTestUsage(model.Id, result);
            results.Add(new BulkModelTestItemDto(model.Id, model.Name, result.Success, result.Message, result.LatencyMs, status));
        }
        return Ok(results);
    }
    private async Task LogTestUsage(Guid modelId, TestResult result)
    {
        try
        {
            var model = await _uow.Repository<AIModel>().Query().Include(m => m.Provider).FirstOrDefaultAsync(m => m.Id == modelId);
            if (model == null) return;
            Guid? apiKeyId = null;
            if (HttpContext.Items.TryGetValue("ApiKeyId", out var akObj) && akObj is Guid ak) apiKeyId = ak;
            var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            decimal? cost = null;
            if (model.PricePerPromptToken.HasValue && model.PricePerCompletionToken.HasValue)
                cost = (model.PricePerPromptToken.Value * result.PromptTokens) + (model.PricePerCompletionToken.Value * result.CompletionTokens);
            var rec = new UsageRecord
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                ApiKeyId = apiKeyId,
                ProviderId = model.ProviderId,
                ModelId = model.Id,
                ModelName = model.Name,
                ProviderName = model.Provider?.Name ?? "",
                PromptTokens = result.PromptTokens,
                CompletionTokens = result.CompletionTokens,
                TotalTokens = result.TotalTokens,
                Cost = cost,
                LatencyMs = result.LatencyMs,
                IsSuccess = result.Success,
                ErrorMessage = result.Success ? null : result.Message,
                IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
                RequestSize = System.Text.Encoding.UTF8.GetByteCount("Hi"),
                ResponseSize = System.Text.Encoding.UTF8.GetByteCount(result.Response ?? ""),
                RequestContent = "Hi",
                ResponseContent = result.Response,
                CreatedAt = DateTime.UtcNow,
            };
            await _uow.Repository<UsageRecord>().AddAsync(rec);
            await _uow.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to persist model test usage");
        }
    }
}