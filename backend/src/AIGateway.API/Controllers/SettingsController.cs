using MediatR; using Microsoft.AspNetCore.Authorization; using Microsoft.AspNetCore.Mvc; using AIGateway.Application.DTOs; using AIGateway.Application.Settings.Queries; using AIGateway.Application.Settings.Commands;
namespace AIGateway.API.Controllers;
[ApiController] [Route("api/[controller]")] [Authorize(Roles = "SuperAdmin,Admin")]
public class SettingsController : ControllerBase
{
    private readonly IMediator _mediator;
    public SettingsController(IMediator mediator) { _mediator = mediator; }
    [HttpGet] public async Task<ActionResult<IEnumerable<SettingDto>>> GetAll() => Ok(await _mediator.Send(new GetSettingsQuery()));
    [HttpPut("{key}")] public async Task<IActionResult> Update(string key, [FromBody] UpdateSettingDto dto) { await _mediator.Send(new UpdateSettingCommand(key, dto.Value)); return NoContent(); }
}
