using MediatR; using Microsoft.AspNetCore.Authorization; using Microsoft.AspNetCore.Mvc; using AIGateway.Application.DTOs; using AIGateway.Application.ProviderTypes.Queries; using AIGateway.Application.ProviderTypes.Commands;
namespace AIGateway.API.Controllers;
[ApiController] [Route("api/[controller]")] [Authorize]
public class ProviderTypesController : ControllerBase
{
    private readonly IMediator _mediator;
    public ProviderTypesController(IMediator mediator) { _mediator = mediator; }
    [HttpGet] public async Task<ActionResult<List<ProviderTypeDto>>> GetAll() => Ok(await _mediator.Send(new GetProviderTypesQuery()));
    [HttpPost] public async Task<ActionResult<ProviderTypeDto>> Create([FromBody] CreateProviderTypeDto dto)
    {
        var result = await _mediator.Send(new CreateProviderTypeCommand(dto.Name));
        return CreatedAtAction(nameof(GetAll), new { id = result.Id }, result);
    }
    [HttpDelete("{id}")] public async Task<IActionResult> Delete(Guid id)
    {
        await _mediator.Send(new DeleteProviderTypeCommand(id));
        return NoContent();
    }
}