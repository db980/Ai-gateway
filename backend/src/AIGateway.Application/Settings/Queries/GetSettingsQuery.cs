using MediatR; using AIGateway.Application.DTOs; using AIGateway.Domain.Interfaces; using AIGateway.Domain.Entities; using Microsoft.EntityFrameworkCore;
namespace AIGateway.Application.Settings.Queries;
public record GetSettingsQuery : IRequest<IEnumerable<SettingDto>>;
public class GetSettingsQueryHandler : IRequestHandler<GetSettingsQuery, IEnumerable<SettingDto>>
{
    private readonly IUnitOfWork _uow;
    public GetSettingsQueryHandler(IUnitOfWork uow) { _uow = uow; }
    public async Task<IEnumerable<SettingDto>> Handle(GetSettingsQuery request, CancellationToken ct)
    {
        return await _uow.Repository<Setting>().Query().Select(s => new SettingDto(s.Key, s.Value, s.Description)).ToListAsync(ct);
    }
}
