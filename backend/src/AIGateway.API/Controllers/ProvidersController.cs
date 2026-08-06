using MediatR; using Microsoft.AspNetCore.Authorization; using Microsoft.AspNetCore.Mvc; using AIGateway.Application.DTOs; using AIGateway.Application.Providers.Commands; using AIGateway.Application.Providers.Queries;
namespace AIGateway.API.Controllers;
[ApiController] [Route("api/[controller]")] [Authorize]
public class ProvidersController : ControllerBase
{
    private readonly IMediator _mediator;
    public ProvidersController(IMediator mediator) { _mediator = mediator; }
    [HttpGet] public async Task<ActionResult<IEnumerable<ProviderDto>>> GetAll() => Ok(await _mediator.Send(new GetProvidersQuery()));
    [HttpPost] public async Task<ActionResult<ProviderDto>> Create([FromBody] CreateProviderDto dto)
    {
        var result = await _mediator.Send(new CreateProviderCommand(
            dto.Name, dto.BaseUrl, dto.ApiKey, dto.ApiKeyExpiresAt, dto.Organization,
            dto.RateLimit, dto.Timeout, dto.IsActive, dto.Priority,
            dto.Headers, dto.AuthType, dto.Type, dto.BodyTemplate, dto.ResponseTemplate, dto.ErrorTemplate,
            dto.Models, dto.ChatEndpointPath, dto.ApiKeys));
        return CreatedAtAction(nameof(GetAll), new { id = result.Id }, result);
    }
    [HttpPut("{id}")] public async Task<ActionResult<ProviderDto>> Update(Guid id, [FromBody] UpdateProviderDto dto)
    {
        var result = await _mediator.Send(new UpdateProviderCommand(
            id, dto.Name, dto.Type, dto.BaseUrl, dto.ApiKey, dto.ApiKeyExpiresAt, dto.Organization,
            dto.RateLimit, dto.Timeout, dto.IsActive, dto.Priority,
            dto.Headers, dto.AuthType, dto.BodyTemplate, dto.ResponseTemplate, dto.ErrorTemplate,
            dto.Models, dto.RemoveModelIds, dto.ChatEndpointPath));
        return Ok(result);
    }
    [HttpDelete("{id}")] public async Task<IActionResult> Delete(Guid id)
    {
        await _mediator.Send(new DeleteProviderCommand(id));
        return NoContent();
    }
    [HttpGet("{id}/keys")] public async Task<ActionResult<IEnumerable<ProviderApiKeyDto>>> GetKeys(Guid id)
    {
        var provider = (await _mediator.Send(new GetProvidersQuery())).FirstOrDefault(p => p.Id == id);
        if (provider == null) return NotFound();
        return Ok(provider.ApiKeys ?? new List<ProviderApiKeyDto>());
    }
    [HttpPost("{id}/keys")] public async Task<ActionResult<ProviderApiKeyDto>> AddKey(Guid id, [FromBody] AddProviderKeyDto dto)
    {
        var result = await _mediator.Send(new AddProviderKeyCommand(id, dto.KeyValue, dto.Name, dto.ExpiresAt, dto.IsActive));
        return Ok(result);
    }
    [HttpPut("{id}/keys/{keyId}/active")] public async Task<ActionResult<ProviderApiKeyDto>> SetKeyActive(Guid id, Guid keyId, [FromBody] SetKeyActiveDto dto)
    {
        var result = await _mediator.Send(new SetProviderKeyActiveCommand(id, keyId, dto.IsActive));
        return Ok(result);
    }
    [HttpDelete("{id}/keys/{keyId}")] public async Task<IActionResult> DeleteKey(Guid id, Guid keyId)
    {
        await _mediator.Send(new DeleteProviderKeyCommand(id, keyId));
        return NoContent();
    }
}