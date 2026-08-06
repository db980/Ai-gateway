using MediatR; using AIGateway.Domain.Interfaces; using AIGateway.Domain.Entities; using AIGateway.Domain.Enums;
namespace AIGateway.Application.Admin.Commands;
public record UpdateUserRoleCommand(Guid UserId, UserRole Role) : IRequest;
public class UpdateUserRoleCommandHandler : IRequestHandler<UpdateUserRoleCommand>
{
    private readonly IUnitOfWork _uow;
    public UpdateUserRoleCommandHandler(IUnitOfWork uow) { _uow = uow; }
    public async Task Handle(UpdateUserRoleCommand request, CancellationToken ct)
    {
        var user = await _uow.Repository<User>().GetByIdAsync(request.UserId);
        if (user == null) throw new KeyNotFoundException("User not found");
        user.Role = request.Role;
        await _uow.SaveChangesAsync();
    }
}
