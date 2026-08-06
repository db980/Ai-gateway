using AIGateway.Domain.Interfaces;
using AIGateway.Persistence.Data;
using AIGateway.Persistence.Repositories;
using System.Collections.Concurrent;
namespace AIGateway.Persistence;
public class UnitOfWork : IUnitOfWork
{
    private readonly AppDbContext _context;
    private readonly ConcurrentDictionary<Type, object> _repositories = new();
    public UnitOfWork(AppDbContext context) { _context = context; }
    public IRepository<T> Repository<T>() where T : class
    {
        return (IRepository<T>)_repositories.GetOrAdd(typeof(T), _ => new Repository<T>(_context));
    }
    public async Task<int> SaveChangesAsync() => await _context.SaveChangesAsync();
    public async Task BeginTransactionAsync() => await _context.Database.BeginTransactionAsync();
    public async Task CommitTransactionAsync() => await _context.Database.CommitTransactionAsync();
    public async Task RollbackTransactionAsync() => await _context.Database.RollbackTransactionAsync();
    public void Dispose() { _context.Dispose(); GC.SuppressFinalize(this); }
}
