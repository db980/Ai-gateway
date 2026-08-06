using MediatR; using AIGateway.Domain.Interfaces; using AIGateway.Domain.Entities; using Microsoft.EntityFrameworkCore;
namespace AIGateway.Application.Models.Commands;
public record UpdateAllModelsPricingCommand(decimal? PricePer1kInput = null, decimal? PricePer1kOutput = null, bool IncludeFree = true) : IRequest<int>;
public class UpdateAllModelsPricingCommandHandler : IRequestHandler<UpdateAllModelsPricingCommand, int>
{
    private readonly IUnitOfWork _uow;
    public UpdateAllModelsPricingCommandHandler(IUnitOfWork uow) { _uow = uow; }
    public async Task<int> Handle(UpdateAllModelsPricingCommand request, CancellationToken ct)
    {
        var query = _uow.Repository<AIModel>().Query();
        if (!request.IncludeFree) query = query.Where(m => !m.IsFree);
        var models = await query.ToListAsync(ct);
        foreach (var model in models)
        {
            if (request.PricePer1kInput.HasValue) model.PricePerPromptToken = request.PricePer1kInput.Value / 1000m;
            if (request.PricePer1kOutput.HasValue) model.PricePerCompletionToken = request.PricePer1kOutput.Value / 1000m;
            await _uow.Repository<AIModel>().UpdateAsync(model);
        }
        await _uow.SaveChangesAsync();
        return models.Count;
    }
}
