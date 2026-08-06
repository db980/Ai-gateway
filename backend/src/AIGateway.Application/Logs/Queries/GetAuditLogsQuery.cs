using MediatR; using AIGateway.Application.DTOs; using AIGateway.Domain.Interfaces; using AIGateway.Domain.Entities; using Microsoft.EntityFrameworkCore;
namespace AIGateway.Application.Logs.Queries;
public record GetAuditLogsQuery(int Page = 1, int PageSize = 50) : IRequest<IEnumerable<AuditLogDto>>;
public class GetAuditLogsQueryHandler : IRequestHandler<GetAuditLogsQuery, IEnumerable<AuditLogDto>>
{
    private readonly IUnitOfWork _uow;
    public GetAuditLogsQueryHandler(IUnitOfWork uow) { _uow = uow; }
    public async Task<IEnumerable<AuditLogDto>> Handle(GetAuditLogsQuery request, CancellationToken ct)
    {
        return await _uow.Repository<AuditLog>().Query().OrderByDescending(l => l.CreatedAt).Skip((request.Page - 1) * request.PageSize).Take(request.PageSize).Select(l => new AuditLogDto(l.Id, null, l.Action, l.Entity, l.CreatedAt)).ToListAsync(ct);
    }
}
