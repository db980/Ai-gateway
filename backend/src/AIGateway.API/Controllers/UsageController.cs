using MediatR; using Microsoft.AspNetCore.Authorization; using Microsoft.AspNetCore.Mvc; using AIGateway.Application.DTOs; using AIGateway.Application.Usage.Queries; using System.Security.Claims;
namespace AIGateway.API.Controllers;
[ApiController] [Route("api/[controller]")] [Authorize]
public class UsageController : ControllerBase
{
    private readonly IMediator _mediator;
    public UsageController(IMediator mediator) { _mediator = mediator; }
    [HttpGet("summary")] public async Task<ActionResult<UsageSummaryDto>> GetSummary() { var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!); return Ok(await _mediator.Send(new GetUsageSummaryQuery(userId))); }
    [HttpGet("charts")] public async Task<ActionResult<List<UsageChartDto>>> GetCharts([FromQuery] int days = 30, [FromQuery] string? providerName = null, [FromQuery] string? modelName = null, [FromQuery] DateTime? from = null, [FromQuery] DateTime? to = null) { var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!); return Ok(await _mediator.Send(new GetUsageChartsQuery(userId, days, providerName, modelName, from, to))); }
    [HttpGet("records")] public async Task<ActionResult<List<UsageRecordDto>>> GetRecords([FromQuery] int page = 1, [FromQuery] int pageSize = 50, [FromQuery] int? days = null, [FromQuery] bool includeContent = false, [FromQuery] Guid? apiKeyId = null) { var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!); return Ok(await _mediator.Send(new GetUsageRecordsQuery(userId, page, pageSize, days, includeContent, apiKeyId))); }
}
