using MediatR; using Microsoft.AspNetCore.Authorization; using Microsoft.AspNetCore.Mvc; using AIGateway.Application.Auth.Commands; using AIGateway.Application.Auth.Queries; using AIGateway.Application.DTOs; using System.Security.Claims;
namespace AIGateway.API.Controllers;
[ApiController] [Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IMediator _mediator;
    public AuthController(IMediator mediator) { _mediator = mediator; }
    [HttpPost("login")] public async Task<ActionResult<AuthResponseDto>> Login([FromBody] LoginDto dto) { var result = await _mediator.Send(new LoginCommand(dto.Email, dto.Password)); return Ok(result); }
    [HttpPost("register")] public async Task<ActionResult<AuthResponseDto>> Register([FromBody] RegisterDto dto) { var result = await _mediator.Send(new RegisterCommand(dto.Email, dto.Username, dto.Password)); return Ok(result); }
    [HttpPost("refresh")] public async Task<ActionResult<AuthResponseDto>> Refresh([FromBody] RefreshTokenDto dto) { var result = await _mediator.Send(new AIGateway.Application.Auth.Commands.RefreshTokenCommand(dto.RefreshToken)); return Ok(result); }
    [Authorize] [HttpGet("profile")] public async Task<ActionResult<UserDto>> GetProfile() { var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!); return Ok(await _mediator.Send(new GetProfileQuery(userId))); }
}
