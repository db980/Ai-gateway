using MediatR; using Microsoft.AspNetCore.Authorization; using Microsoft.AspNetCore.Mvc; using AIGateway.Application.DTOs; using AIGateway.Application.Analytics.Queries;
namespace AIGateway.API.Controllers;
[ApiController] [Route("api/[controller]")] [Authorize(Roles = "SuperAdmin,Admin")]
public class AnalyticsController : ControllerBase
{
    private readonly IMediator _mediator;
    public AnalyticsController(IMediator mediator) { _mediator = mediator; }
    [HttpGet("overview")] public async Task<ActionResult<AnalyticsOverviewDto>> GetOverview() => Ok(await _mediator.Send(new GetAnalyticsOverviewQuery()));
}
