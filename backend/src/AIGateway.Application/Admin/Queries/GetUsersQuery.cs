using MediatR; using AIGateway.Application.DTOs; using AIGateway.Domain.Interfaces; using AIGateway.Domain.Entities; using Microsoft.EntityFrameworkCore;
namespace AIGateway.Application.Admin.Queries;
public record GetUsersQuery : IRequest<IEnumerable<AdminUserDto>>;
public class GetUsersQueryHandler : IRequestHandler<GetUsersQuery, IEnumerable<AdminUserDto>>
{
    private readonly IUnitOfWork _uow;
    public GetUsersQueryHandler(IUnitOfWork uow) { _uow = uow; }
    public async Task<IEnumerable<AdminUserDto>> Handle(GetUsersQuery request, CancellationToken ct)
    {
        return await _uow.Repository<User>().Query().Select(u => new AdminUserDto(u.Id, u.Email, u.Username, u.Role.ToString(), u.Plan.ToString(), u.IsActive, u.Credits, u.CreatedAt)).ToListAsync(ct);
    }
}
