using System.Text.Json.Serialization;
using Serilog;
using AIGateway.API.Middleware;
using AIGateway.Application;
using AIGateway.Infrastructure;
using AIGateway.Persistence;
using AIGateway.Persistence.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi.Models;

Console.Error.WriteLine("=== Program.cs starting at " + DateTime.Now + " ===");
Log.Logger = new LoggerConfiguration().WriteTo.Console().CreateBootstrapLogger();
try
{
    Console.Error.WriteLine("Creating builder...");
    var builder = WebApplication.CreateBuilder(args);

    Console.Error.WriteLine("Configuring Serilog...");
    builder.Host.UseSerilog((context, services, configuration) =>
        configuration.ReadFrom.Configuration(context.Configuration));

    Console.Error.WriteLine("Adding services...");
    builder.Services.AddApplication();
    builder.Services.AddInfrastructure(builder.Configuration);
    builder.Services.AddPersistence(builder.Configuration);

    builder.Services.AddControllers().AddJsonOptions(o => o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));
    builder.Services.AddEndpointsApiExplorer();
    builder.Services.AddSwaggerGen(c =>
    {
        c.SwaggerDoc("v1", new OpenApiInfo { Title = "AI Gateway API", Version = "v1" });
        c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
        {
            Description = "JWT Authorization header using the Bearer scheme",
            Name = "Authorization", In = ParameterLocation.Header, Type = SecuritySchemeType.ApiKey, Scheme = "Bearer"
        });
        c.AddSecurityRequirement(new OpenApiSecurityRequirement
        {
            [new OpenApiSecurityScheme { Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" } }] = Array.Empty<string>()
        });
    });

    builder.Services.AddCors(options =>
    {
        options.AddPolicy("AllowFrontend", policy =>
        {
            policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod();
        });
    });

    Console.Error.WriteLine("Building app...");
    var app = builder.Build();

    Console.Error.WriteLine("Seeding database...");
    using (var scope = app.Services.CreateScope())
    {
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await db.Database.EnsureCreatedAsync();
        await DbSeeder.SeedAsync(db);
    }

    Console.Error.WriteLine("Configuring middleware...");
    app.UseSerilogRequestLogging();
    app.UseMiddleware<ExceptionMiddleware>();
    app.UseMiddleware<RequestLoggingMiddleware>();
    app.UseMiddleware<ApiKeyMiddleware>();
    app.UseCors("AllowFrontend");
    app.UseSwagger();
    app.UseSwaggerUI();
    app.UseAuthentication();
    app.UseAuthorization();

    app.Use(async (ctx, next) =>
    {
        if (ctx.Request.Path.StartsWithSegments("/gateway/chat/completions") && HttpMethods.IsPost(ctx.Request.Method))
        {
            ctx.Request.EnableBuffering();
            await next();
            ctx.Request.Body.Position = 0;
            using var reader = new StreamReader(ctx.Request.Body, leaveOpen: true);
            var raw = await reader.ReadToEndAsync();
            System.IO.File.AppendAllText(@"C:\Users\Admin\AppData\Local\Temp\2\opencode\rawbody.txt", "=== " + DateTime.Now.ToString("HH:mm:ss.fff") + " ===\n" + raw + "\n");
        }
        else await next();
    });

    app.MapControllers();
    app.Run();
}
catch (Exception ex) { Log.Fatal(ex, "Application terminated unexpectedly"); }
finally { Log.CloseAndFlush(); }
