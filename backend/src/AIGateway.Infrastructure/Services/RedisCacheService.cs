using Microsoft.Extensions.Caching.Distributed;
using AIGateway.Application.Interfaces;
using System.Text.Json;
namespace AIGateway.Infrastructure.Services;
public class RedisCacheService : ICacheService
{
    private readonly IDistributedCache _cache;
    public RedisCacheService(IDistributedCache cache) { _cache = cache; }
    public async Task<T?> GetAsync<T>(string key)
    {
        var data = await _cache.GetStringAsync(key);
        return data is null ? default : JsonSerializer.Deserialize<T>(data);
    }
    public async Task SetAsync<T>(string key, T value, TimeSpan? expiration = null)
    {
        var options = new DistributedCacheEntryOptions();
        if (expiration.HasValue) options.AbsoluteExpirationRelativeToNow = expiration;
        await _cache.SetStringAsync(key, JsonSerializer.Serialize(value), options);
    }
    public async Task RemoveAsync(string key) => await _cache.RemoveAsync(key);
}
