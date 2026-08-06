using AIGateway.Domain.Interfaces; using AIGateway.Domain.Entities; using Microsoft.EntityFrameworkCore;
namespace AIGateway.API.Middleware;
public class ApiKeyMiddleware { private readonly RequestDelegate _next; public ApiKeyMiddleware(RequestDelegate next) { _next = next; } public async Task InvokeAsync(HttpContext context, IUnitOfWork uow)
{
    if (context.Request.Method == "POST" && (context.Request.Path.StartsWithSegments("/api/chat") || context.Request.Path.StartsWithSegments("/gateway/chat/completions")))
    {
        var apiKey = context.Request.Headers["X-Api-Key"].FirstOrDefault() ?? context.Request.Headers["Authorization"].FirstOrDefault()?.Replace("Bearer ", "");
        if (!string.IsNullOrEmpty(apiKey))
        {
            var key = await uow.Repository<ApiKey>().Query().Include(k => k.User).FirstOrDefaultAsync(k => k.Key == apiKey);
            if (key != null && key.Status == Domain.Enums.ApiKeyStatus.Active && (key.ExpiresAt == null || key.ExpiresAt > DateTime.UtcNow))
            {
                context.Items["UserId"] = key.UserId;
                context.Items["ApiKeyId"] = key.Id;
                context.Items["User"] = key.User;
            }
        }
    }
    await _next(context);
} }
