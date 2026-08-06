using MediatR; using Microsoft.AspNetCore.Authorization; using Microsoft.AspNetCore.Mvc; using AIGateway.Application.DTOs; using AIGateway.Application.ApiKeys.Commands; using AIGateway.Application.ApiKeys.Queries; using System.Security.Claims; using AIGateway.Domain.Entities; using AIGateway.Domain.Interfaces; using Microsoft.EntityFrameworkCore;
namespace AIGateway.API.Controllers;
[ApiController] [Route("api/[controller]")] [Authorize]
public class ApiKeysController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly IUnitOfWork _uow;
    public ApiKeysController(IMediator mediator, IUnitOfWork uow) { _mediator = mediator; _uow = uow; }
    [HttpGet] public async Task<ActionResult<IEnumerable<ApiKeyDto>>> GetAll() { var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!); return Ok(await _mediator.Send(new GetApiKeysQuery(userId))); }
    [HttpPost] public async Task<ActionResult<ApiKeyFullDto>> Create([FromBody] CreateApiKeyDto dto) { var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!); var result = await _mediator.Send(new CreateApiKeyCommand(userId, dto.Name, dto.ExpiresAt, dto.IpWhitelist, dto.RateLimit, dto.Quota, dto.RestrictToActiveModels)); return Ok(result); }
    [HttpGet("{id}")] public async Task<ActionResult<ApiKeyFullDto>> Get(Guid id)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var key = await _uow.Repository<ApiKey>().Query().FirstOrDefaultAsync(k => k.Id == id && k.UserId == userId);
        if (key == null) return NotFound();
        return Ok(new ApiKeyFullDto(key.Id, key.Key, key.Prefix, key.Name, key.Status.ToString(), key.ExpiresAt, key.IpWhitelist, key.RateLimit, key.Quota, key.UsedTokens, key.CreatedAt, key.RestrictToActiveModels, key.AllowedModelIds));
    }
    [HttpPut("{id}/models")] public async Task<ActionResult> SetAllowedModels(Guid id, [FromBody] SetAllowedModelsDto dto)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var key = await _uow.Repository<ApiKey>().Query().FirstOrDefaultAsync(k => k.Id == id && k.UserId == userId);
        if (key == null) return NotFound();
        key.AllowedModelIds = dto.ModelIds is { Length: > 0 } ? string.Join(',', dto.ModelIds) : null;
        await _uow.Repository<ApiKey>().UpdateAsync(key);
        await _uow.SaveChangesAsync();
        return NoContent();
    }
    [HttpDelete("{id}")] public async Task<ActionResult> Delete(Guid id) { var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!); var ok = await _mediator.Send(new DeleteApiKeyCommand(userId, id)); return ok ? NoContent() : NotFound(); }
}
