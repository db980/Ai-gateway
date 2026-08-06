using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using AIGateway.Application.Interfaces;
using AIGateway.Infrastructure.Services;
using System.Text;
using Serilog;
namespace AIGateway.Infrastructure;
public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(options =>
        {
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true, ValidateAudience = true, ValidateLifetime = true, ValidateIssuerSigningKey = true,
                ValidIssuer = configuration["Jwt:Issuer"], ValidAudience = configuration["Jwt:Audience"],
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(configuration["Jwt:Key"] ?? "DefaultSuperSecretKeyForDev12345678!"))
            };
            options.Events = new JwtBearerEvents
            {
                OnAuthenticationFailed = context =>
                {
                    Log.Error(context.Exception, "JWT authentication failed for {Path}. Exception: {Message}", context.Request.Path, context.Exception.Message);
                    return Task.CompletedTask;
                },
                OnChallenge = context =>
                {
                    Log.Warning("JWT challenge issued for {Path}. Error: {Error}, Description: {Description}", context.Request.Path, context.Error, context.ErrorDescription);
                    return Task.CompletedTask;
                }
            };
        });
        services.AddAuthorization();
        var redisConnection = configuration.GetConnectionString("Redis");
        if (!string.IsNullOrEmpty(redisConnection))
            services.AddStackExchangeRedisCache(options => { options.Configuration = redisConnection; });
        else
            services.AddDistributedMemoryCache();
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IAiProviderService, AiProviderService>();
        services.AddSingleton<IModelRateLimiter, ModelRateLimiter>();
        services.AddScoped<ICacheService, RedisCacheService>();
        services.AddScoped<IPaymentGateway>(sp =>
        {
            var cfg = sp.GetRequiredService<IConfiguration>();
            var provider = cfg["PaymentGateway:Provider"];
            var key = cfg["PaymentGateway:SecretKey"];
            if (string.Equals(provider, "stripe", StringComparison.OrdinalIgnoreCase) && !string.IsNullOrEmpty(key))
                return new StripePaymentGateway(key!, sp.GetRequiredService<IHttpClientFactory>());
            return new MockPaymentGateway();
        });
        services.AddHttpClient();
        return services;
    }
}
