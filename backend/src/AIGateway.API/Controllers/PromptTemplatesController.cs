using MediatR; using Microsoft.AspNetCore.Authorization; using Microsoft.AspNetCore.Mvc; using AIGateway.Application.DTOs; using AIGateway.Application.PromptTemplates.Commands; using AIGateway.Application.PromptTemplates.Queries; using System.Security.Claims;
namespace AIGateway.API.Controllers;
[ApiController] [Route("api/[controller]")] [Authorize]
public class PromptTemplatesController : ControllerBase
{
    private readonly IMediator _mediator;
    public PromptTemplatesController(IMediator mediator) { _mediator = mediator; }
    [HttpGet] public async Task<ActionResult<IEnumerable<PromptTemplateDto>>> GetAll() { var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!); return Ok(await _mediator.Send(new GetPromptTemplatesQuery(userId))); }
    [HttpPost] public async Task<ActionResult<PromptTemplateDto>> Create([FromBody] CreatePromptTemplateDto dto) { var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!); var result = await _mediator.Send(new CreatePromptTemplateCommand(userId, dto.Name, dto.Content, dto.Category, dto.Tags, dto.IsPublic)); return CreatedAtAction(nameof(GetAll), new { id = result.Id }, result); }
}
