using MediatR; using Microsoft.EntityFrameworkCore; using AIGateway.Domain.Interfaces; using AIGateway.Domain.Entities;
namespace AIGateway.Application.ApiKeys.Commands;
public record DeleteApiKeyCommand(Guid UserId, Guid KeyId) : IRequest<bool>;
public class DeleteApiKeyCommandHandler : IRequestHandler<DeleteApiKeyCommand, bool>
{
    private readonly IUnitOfWork _uow;
    public DeleteApiKeyCommandHandler(IUnitOfWork uow) { _uow = uow; }
    public async Task<bool> Handle(DeleteApiKeyCommand request, CancellationToken ct)
    {
        var key = await _uow.Repository<ApiKey>().Query().FirstOrDefaultAsync(k => k.Id == request.KeyId && k.UserId == request.UserId, ct);
        if (key == null) return false;
        await _uow.Repository<ApiKey>().DeleteAsync(key);
        await _uow.SaveChangesAsync();
        return true;
    }
}
