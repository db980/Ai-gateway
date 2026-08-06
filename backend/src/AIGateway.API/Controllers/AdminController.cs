using MediatR; using Microsoft.AspNetCore.Authorization; using Microsoft.AspNetCore.Mvc; using AIGateway.Application.DTOs; using AIGateway.Application.Admin.Queries; using AIGateway.Application.Admin.Commands;
namespace AIGateway.API.Controllers;
[ApiController] [Route("api/[controller]")] [Authorize(Roles = "SuperAdmin,Admin")]
public class AdminController : ControllerBase
{
    private readonly IMediator _mediator;
    public AdminController(IMediator mediator) { _mediator = mediator; }
    [HttpGet("users")] public async Task<ActionResult<IEnumerable<AdminUserDto>>> GetUsers() => Ok(await _mediator.Send(new GetUsersQuery()));
    [HttpPut("users/{id}/role")] public async Task<IActionResult> UpdateUserRole(Guid id, [FromBody] UpdateUserRoleDto dto) { await _mediator.Send(new UpdateUserRoleCommand(id, dto.Role)); return NoContent(); }
}
