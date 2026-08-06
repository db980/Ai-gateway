using Microsoft.EntityFrameworkCore;
using AIGateway.Domain.Interfaces;
using AIGateway.Persistence.Data;
using System.Linq.Expressions;
namespace AIGateway.Persistence.Repositories;
public class Repository<T> : IRepository<T> where T : class
{
    protected readonly AppDbContext _context;
    protected readonly DbSet<T> _dbSet;
    public Repository(AppDbContext context) { _context = context; _dbSet = context.Set<T>(); }
    public async Task<T?> GetByIdAsync(Guid id) => await _dbSet.FindAsync(id);
    public async Task<IEnumerable<T>> GetAllAsync() => await _dbSet.ToListAsync();
    public async Task<IEnumerable<T>> FindAsync(Expression<Func<T, bool>> predicate) => await _dbSet.Where(predicate).ToListAsync();
    public async Task<T> AddAsync(T entity) { var r = await _dbSet.AddAsync(entity); return r.Entity; }
    public Task UpdateAsync(T entity) { _dbSet.Update(entity); return Task.CompletedTask; }
    public Task DeleteAsync(T entity) { _dbSet.Remove(entity); return Task.CompletedTask; }
    public IQueryable<T> Query() => _dbSet.AsQueryable();
}
