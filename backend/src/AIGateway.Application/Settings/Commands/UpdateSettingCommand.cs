using MediatR; using AIGateway.Domain.Interfaces; using AIGateway.Domain.Entities; using Microsoft.EntityFrameworkCore;
namespace AIGateway.Application.Settings.Commands;
public record UpdateSettingCommand(string Key, string Value) : IRequest;
public class UpdateSettingCommandHandler : IRequestHandler<UpdateSettingCommand>
{
    private readonly IUnitOfWork _uow;
    public UpdateSettingCommandHandler(IUnitOfWork uow) { _uow = uow; }
    public async Task Handle(UpdateSettingCommand request, CancellationToken ct)
    {
        var setting = await _uow.Repository<Setting>().Query().FirstOrDefaultAsync(s => s.Key == request.Key, ct);
        if (setting == null) throw new KeyNotFoundException("Setting not found");
        setting.Value = request.Value;
        setting.UpdatedAt = DateTime.UtcNow;
        await _uow.SaveChangesAsync();
    }
}
