using MediatR; using AIGateway.Application.DTOs; using AIGateway.Domain.Entities; using AIGateway.Domain.Enums; using AIGateway.Domain.Interfaces; using Microsoft.EntityFrameworkCore;
namespace AIGateway.Application.Billing.Commands;
public record CancelPlanCommand(Guid UserId) : IRequest<CancelResultDto>;
public class CancelPlanCommandHandler : IRequestHandler<CancelPlanCommand, CancelResultDto>
{
    private readonly IUnitOfWork _uow;
    public CancelPlanCommandHandler(IUnitOfWork uow) { _uow = uow; }
    public async Task<CancelResultDto> Handle(CancelPlanCommand request, CancellationToken ct)
    {
        var user = await _uow.Repository<User>().Query().FirstOrDefaultAsync(u => u.Id == request.UserId, ct);
        if (user is null) return new CancelResultDto(false, "User not found");
        if (user.Plan == PlanType.Free) return new CancelResultDto(false, "You are already on the Free plan");
        user.Plan = PlanType.Free;
        user.UpdatedAt = DateTime.UtcNow;
        await _uow.SaveChangesAsync();
        return new CancelResultDto(true, "Subscription cancelled. You are back on the Free plan.");
    }
}
