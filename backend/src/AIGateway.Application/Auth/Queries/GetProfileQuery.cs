using MediatR;
using AIGateway.Application.DTOs;
using AIGateway.Domain.Interfaces;
using AIGateway.Domain.Entities;
using Microsoft.EntityFrameworkCore;
namespace AIGateway.Application.Auth.Queries;
public record GetProfileQuery(Guid UserId) : IRequest<UserDto>;
public class GetProfileQueryHandler : IRequestHandler<GetProfileQuery, UserDto>
{
    private readonly IUnitOfWork _uow;
    public GetProfileQueryHandler(IUnitOfWork uow) { _uow = uow; }
    public async Task<UserDto> Handle(GetProfileQuery request, CancellationToken ct)
    {
        var user = await _uow.Repository<Domain.Entities.User>().Query().FirstOrDefaultAsync(u => u.Id == request.UserId, ct);
        if (user == null) throw new KeyNotFoundException("User not found");
        return new UserDto(user.Id, user.Email, user.Username, user.Role.ToString(), user.Plan.ToString(), user.Credits);
    }
}
