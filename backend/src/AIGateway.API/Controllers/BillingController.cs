using MediatR; using Microsoft.AspNetCore.Authorization; using Microsoft.AspNetCore.Mvc; using AIGateway.Application.DTOs; using AIGateway.Application.Billing.Commands; using AIGateway.Application.Billing.Queries; using System.Security.Claims;
namespace AIGateway.API.Controllers;
[ApiController] [Route("api/[controller]")] [Authorize]
public class BillingController : ControllerBase
{
    private readonly IMediator _mediator;
    public BillingController(IMediator mediator) { _mediator = mediator; }
    [HttpGet("plans")] public async Task<ActionResult<IEnumerable<PlanDto>>> GetPlans() => Ok(await _mediator.Send(new GetPlansQuery()));
    [HttpGet("summary")] public async Task<ActionResult<BillingSummaryDto>> GetSummary() { var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!); return Ok(await _mediator.Send(new GetBillingSummaryQuery(userId))); }
    [HttpGet("invoices")] public async Task<ActionResult<IEnumerable<InvoiceDto>>> GetInvoices() { var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!); return Ok(await _mediator.Send(new GetInvoicesQuery(userId))); }
    [HttpPost("checkout")] public async Task<ActionResult<CheckoutResultDto>> Checkout([FromBody] CheckoutRequestDto request) { var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!); return Ok(await _mediator.Send(new CheckoutCommand(userId, request))); }
    [HttpPost("cancel")] public async Task<ActionResult<CancelResultDto>> Cancel() { var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!); return Ok(await _mediator.Send(new CancelPlanCommand(userId))); }
}
