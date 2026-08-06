using MediatR; using Microsoft.AspNetCore.Authorization; using Microsoft.AspNetCore.Mvc; using AIGateway.Application.DTOs; using AIGateway.Application.Logs.Queries;
namespace AIGateway.API.Controllers;
[ApiController] [Route("api/[controller]")] [Authorize(Roles = "SuperAdmin,Admin")]
public class LogsController : ControllerBase
{
    private readonly IMediator _mediator;
    public LogsController(IMediator mediator) { _mediator = mediator; }
    [HttpGet] public async Task<ActionResult<IEnumerable<AuditLogDto>>> GetLogs([FromQuery] int page = 1, [FromQuery] int pageSize = 50) => Ok(await _mediator.Send(new GetAuditLogsQuery(page, pageSize)));
}
