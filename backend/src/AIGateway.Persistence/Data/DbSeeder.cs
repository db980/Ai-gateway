using Microsoft.EntityFrameworkCore;
using AIGateway.Domain.Entities;
using AIGateway.Domain.Enums;

namespace AIGateway.Persistence.Data;

public static class DbSeeder
{
    public static async Task SeedAsync(AppDbContext context)
    {
        try { await context.Database.ExecuteSqlRawAsync("SELECT 1 FROM ProviderTypes"); }
        catch
        {
            await context.Database.ExecuteSqlRawAsync("CREATE TABLE ProviderTypes (Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY, Name NVARCHAR(100) NOT NULL, CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE())");
            await context.Database.ExecuteSqlRawAsync("CREATE UNIQUE INDEX IX_ProviderTypes_Name ON ProviderTypes (Name)");
            var types = GetProviderTypes();
            foreach (var t in types)
                await context.Database.ExecuteSqlRawAsync("INSERT INTO ProviderTypes (Id, Name, CreatedAt) VALUES (@p0, @p1, @p2)", t.Id, t.Name, DateTime.UtcNow);
        }

        try { await context.Database.ExecuteSqlRawAsync("SELECT 1 FROM ProviderApiKeys"); }
        catch
        {
            await context.Database.ExecuteSqlRawAsync("CREATE TABLE ProviderApiKeys (Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY, ProviderId UNIQUEIDENTIFIER NOT NULL, KeyValue NVARCHAR(500) NOT NULL, Name NVARCHAR(200) NULL, IsActive BIT NOT NULL DEFAULT 0, ExpiresAt DATETIME2 NULL, CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE())");
            await context.Database.ExecuteSqlRawAsync("CREATE INDEX IX_ProviderApiKeys_ProviderId ON ProviderApiKeys (ProviderId)");
            await context.Database.ExecuteSqlRawAsync("ALTER TABLE ProviderApiKeys ADD CONSTRAINT FK_ProviderApiKeys_Providers_ProviderId FOREIGN KEY (ProviderId) REFERENCES Providers (Id) ON DELETE CASCADE");
        }

        await context.Database.ExecuteSqlRawAsync(
            "INSERT INTO ProviderApiKeys (Id, ProviderId, KeyValue, Name, IsActive, ExpiresAt, CreatedAt) " +
            "SELECT NEWID(), p.Id, p.ApiKey, p.Name, 1, p.ApiKeyExpiresAt, GETUTCDATE() FROM Providers p " +
            "WHERE p.ApiKey IS NOT NULL AND LTRIM(RTRIM(p.ApiKey)) <> '' " +
            "AND NOT EXISTS (SELECT 1 FROM ProviderApiKeys k WHERE k.ProviderId = p.Id)");

        if (await context.Users.AnyAsync())
        {
            var expectedHash = Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(System.Text.Encoding.UTF8.GetBytes("Admin@123")));
            var existingAdmin = await context.Users.FirstOrDefaultAsync(u => u.Email == "admin@aigw.com");
            if (existingAdmin != null && existingAdmin.PasswordHash != expectedHash)
            {
                existingAdmin.PasswordHash = expectedHash;
                var existingDemo = await context.Users.FirstOrDefaultAsync(u => u.Email == "demo@aigw.com");
                if (existingDemo != null) existingDemo.PasswordHash = expectedHash;
                await context.SaveChangesAsync();
            }
            return;
        }

        var now = DateTime.UtcNow;
        var adminId = Guid.NewGuid();
        var admin = new User
        {
            Id = adminId,
            Email = "admin@aigw.com",
            Username = "SuperAdmin",
            PasswordHash = Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(System.Text.Encoding.UTF8.GetBytes("Admin@123"))),
            Role = UserRole.SuperAdmin,
            IsActive = true,
            Plan = PlanType.Enterprise,
            Credits = 999999,
            CreatedAt = now
        };
        context.Users.Add(admin);

        var demoUserId = Guid.NewGuid();
        var demoUser = new User
        {
            Id = demoUserId,
            Email = "demo@aigw.com",
            Username = "DemoUser",
            PasswordHash = Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(System.Text.Encoding.UTF8.GetBytes("Admin@123"))),
            Role = UserRole.User,
            IsActive = true,
            Plan = PlanType.Free,
            Credits = 100,
            CreatedAt = now
        };
        context.Users.Add(demoUser);

        var refreshToken = new RefreshToken
        {
            Id = Guid.NewGuid(),
            UserId = adminId,
            Token = Convert.ToBase64String(Guid.NewGuid().ToByteArray().Concat(Guid.NewGuid().ToByteArray()).ToArray()),
            ExpiresAt = now.AddDays(7),
            IsRevoked = false,
            CreatedAt = now
        };
        context.RefreshTokens.Add(refreshToken);

        var apiKey = new ApiKey
        {
            Id = Guid.NewGuid(),
            UserId = adminId,
            Key = "agw_" + Convert.ToBase64String(Guid.NewGuid().ToByteArray().Concat(Guid.NewGuid().ToByteArray()).ToArray()).Replace("=", "").Replace("+", "-").Replace("/", "_"),
            Prefix = "agw",
            Name = "Default Admin Key",
            Status = ApiKeyStatus.Active,
            RateLimit = 1000,
            Quota = 10000000,
            CreatedAt = now
        };
        context.ApiKeys.Add(apiKey);

        var providerTypes = GetProviderTypes();
        context.ProviderTypes.AddRange(providerTypes);
        await context.SaveChangesAsync();

        var providers = GetProviders();
        context.Providers.AddRange(providers);

        var models = GetModels(providers);
        context.AIModels.AddRange(models);

        var usageRecord = new UsageRecord
        {
            Id = Guid.NewGuid(),
            UserId = adminId,
            ApiKeyId = apiKey.Id,
            ProviderId = providers[0].Id,
            ModelId = models[0].Id,
            ModelName = "gpt-4o",
            ProviderName = "OpenAI",
            PromptTokens = 150,
            CompletionTokens = 50,
            TotalTokens = 200,
            Cost = 0.003m,
            LatencyMs = 1200,
            IsSuccess = true,
            IpAddress = "127.0.0.1",
            RequestSize = 2048,
            ResponseSize = 4096,
            CreatedAt = now.AddHours(-1)
        };
        context.UsageRecords.Add(usageRecord);

        var promptTemplates = new List<PromptTemplate>
        {
            new()
            {
                Id = Guid.NewGuid(), UserId = adminId, Name = "Code Review",
                Content = "Review the following code for bugs, performance issues, and best practices:\n\n```\n{code}\n```",
                Category = "Development", Tags = "code,review", IsFavorite = true, IsPublic = true, CreatedAt = now
            },
            new()
            {
                Id = Guid.NewGuid(), UserId = adminId, Name = "Translation",
                Content = "Translate the following text from {source_language} to {target_language}:\n\n{text}",
                Category = "Utility", Tags = "translation", IsFavorite = false, IsPublic = true, CreatedAt = now
            },
            new()
            {
                Id = Guid.NewGuid(), UserId = demoUserId, Name = "Summarize",
                Content = "Summarize the following text in {num_sentences} sentences:\n\n{text}",
                Category = "Productivity", Tags = "summary", IsFavorite = true, IsPublic = false, CreatedAt = now
            },
        };
        context.PromptTemplates.AddRange(promptTemplates);

        var invoices = new List<Invoice>
        {
            new()
            {
                Id = Guid.NewGuid(), UserId = adminId, InvoiceNumber = "INV-2026-001",
                Amount = 49.99m, Currency = "USD", Status = "Paid",
                StripeInvoiceId = "in_1ABCDEFghijklmnop", CreatedAt = now.AddDays(-30), PaidAt = now.AddDays(-28)
            },
            new()
            {
                Id = Guid.NewGuid(), UserId = adminId, InvoiceNumber = "INV-2026-002",
                Amount = 49.99m, Currency = "USD", Status = "Pending",
                StripeInvoiceId = "in_2ABCDEFghijklmnop", CreatedAt = now.AddDays(-2)
            },
        };
        context.Invoices.AddRange(invoices);

        var auditLog = new AuditLog
        {
            Id = Guid.NewGuid(), UserId = adminId, Action = "Database Seeded",
            Entity = "System", EntityId = "N/A",
            OldValues = null, NewValues = "Initial seed completed",
            IpAddress = "127.0.0.1", CreatedAt = now
        };
        context.AuditLogs.Add(auditLog);

        var settings = new List<Setting>
        {
            new() { Id = Guid.NewGuid(), Key = "SystemName", Value = "AI Gateway Platform", Description = "Display name of the system" },
            new() { Id = Guid.NewGuid(), Key = "DefaultCredits", Value = "100", Description = "Default credits for new users" },
            new() { Id = Guid.NewGuid(), Key = "MaxApiKeysPerUser", Value = "10", Description = "Maximum API keys per user" },
            new() { Id = Guid.NewGuid(), Key = "JwtExpiryMinutes", Value = "60", Description = "JWT token expiry in minutes" },
            new() { Id = Guid.NewGuid(), Key = "RefreshTokenExpiryDays", Value = "7", Description = "Refresh token expiry in days" },
            new() { Id = Guid.NewGuid(), Key = "EnableAuditLog", Value = "true", Description = "Enable audit logging" },
            new() { Id = Guid.NewGuid(), Key = "RateLimit.Default", Value = "100", Description = "Default rate limit per minute" },
            new() { Id = Guid.NewGuid(), Key = "RateLimit.Premium", Value = "1000", Description = "Premium rate limit per minute" },
            new() { Id = Guid.NewGuid(), Key = "Stripe.DefaultCurrency", Value = "USD", Description = "Default currency for billing" },
            new() { Id = Guid.NewGuid(), Key = "MaintenanceMode", Value = "false", Description = "Enable maintenance mode" },
            new() { Id = Guid.NewGuid(), Key = "SmtpHost", Value = "", Description = "SMTP server host" },
            new() { Id = Guid.NewGuid(), Key = "SmtpPort", Value = "587", Description = "SMTP server port" },
            new() { Id = Guid.NewGuid(), Key = "SmtpUsername", Value = "", Description = "SMTP username" },
            new() { Id = Guid.NewGuid(), Key = "SmtpPassword", Value = "", Description = "SMTP password" },
            new() { Id = Guid.NewGuid(), Key = "SmtpFromAddress", Value = "noreply@aigw.com", Description = "Email from address" },
        };
        context.Settings.AddRange(settings);

        await context.SaveChangesAsync();
    }

    private static List<Domain.Entities.ProviderType> GetProviderTypes()
    {
        return new List<Domain.Entities.ProviderType>
        {
            new Domain.Entities.ProviderType { Id = Guid.NewGuid(), Name = "OpenAI" },
            new Domain.Entities.ProviderType { Id = Guid.NewGuid(), Name = "AzureOpenAI" },
            new Domain.Entities.ProviderType { Id = Guid.NewGuid(), Name = "Claude" },
            new Domain.Entities.ProviderType { Id = Guid.NewGuid(), Name = "Gemini" },
            new Domain.Entities.ProviderType { Id = Guid.NewGuid(), Name = "DeepSeek" },
            new Domain.Entities.ProviderType { Id = Guid.NewGuid(), Name = "Groq" },
            new Domain.Entities.ProviderType { Id = Guid.NewGuid(), Name = "Mistral" },
            new Domain.Entities.ProviderType { Id = Guid.NewGuid(), Name = "OpenRouter" },
            new Domain.Entities.ProviderType { Id = Guid.NewGuid(), Name = "Ollama" },
            new Domain.Entities.ProviderType { Id = Guid.NewGuid(), Name = "LMStudio" },
            new Domain.Entities.ProviderType { Id = Guid.NewGuid(), Name = "CustomRESTAPI" },
            new Domain.Entities.ProviderType { Id = Guid.NewGuid(), Name = "Cohere" },
            new Domain.Entities.ProviderType { Id = Guid.NewGuid(), Name = "Cerebras" },
            new Domain.Entities.ProviderType { Id = Guid.NewGuid(), Name = "Cloudflare" },
            new Domain.Entities.ProviderType { Id = Guid.NewGuid(), Name = "GitHub" },
            new Domain.Entities.ProviderType { Id = Guid.NewGuid(), Name = "HuggingFace" },
            new Domain.Entities.ProviderType { Id = Guid.NewGuid(), Name = "KiloCode" },
            new Domain.Entities.ProviderType { Id = Guid.NewGuid(), Name = "LLM7" },
            new Domain.Entities.ProviderType { Id = Guid.NewGuid(), Name = "ModelScope" },
            new Domain.Entities.ProviderType { Id = Guid.NewGuid(), Name = "NVIDIA" },
            new Domain.Entities.ProviderType { Id = Guid.NewGuid(), Name = "OVHcloud" },
            new Domain.Entities.ProviderType { Id = Guid.NewGuid(), Name = "SambaNova" },
            new Domain.Entities.ProviderType { Id = Guid.NewGuid(), Name = "SiliconFlow" },
            new Domain.Entities.ProviderType { Id = Guid.NewGuid(), Name = "AionLabs" },
            new Domain.Entities.ProviderType { Id = Guid.NewGuid(), Name = "ZAI" },
        };
    }

    private static List<Provider> GetProviders()
    {
        return new List<Provider>
        {
            new() { Id = Guid.NewGuid(), Name = "OpenAI", Type = "OpenAI", BaseUrl = "https://api.openai.com/v1", ChatEndpointPath = "chat/completions", IsActive = true, Priority = 1, AuthType = "Bearer", RateLimit = 500, Timeout = 60 },
            new() { Id = Guid.NewGuid(), Name = "Azure OpenAI", Type = "AzureOpenAI", BaseUrl = "https://{resource}.openai.azure.com", IsActive = true, Priority = 2, AuthType = "ApiKey", RateLimit = 500, Timeout = 60 },
            new() { Id = Guid.NewGuid(), Name = "Claude (Anthropic)", Type = "Claude", BaseUrl = "https://api.anthropic.com/v1", IsActive = true, Priority = 3, AuthType = "x-api-key", RateLimit = 500, Timeout = 60 },
            new() { Id = Guid.NewGuid(), Name = "Gemini (Google)", Type = "Gemini", BaseUrl = "https://generativelanguage.googleapis.com/v1beta", IsActive = true, Priority = 4, AuthType = "QueryKey", RateLimit = 1500, Timeout = 60 },
            new() { Id = Guid.NewGuid(), Name = "DeepSeek", Type = "DeepSeek", BaseUrl = "https://api.deepseek.com/v1", IsActive = true, Priority = 5, AuthType = "Bearer", RateLimit = 500, Timeout = 120 },
            new() { Id = Guid.NewGuid(), Name = "Groq", Type = "Groq", BaseUrl = "https://api.groq.com/openai/v1", IsActive = true, Priority = 6, AuthType = "Bearer", RateLimit = 30, Timeout = 60 },
            new() { Id = Guid.NewGuid(), Name = "Mistral AI", Type = "Mistral", BaseUrl = "https://api.mistral.ai/v1", IsActive = true, Priority = 7, AuthType = "Bearer", RateLimit = 500, Timeout = 120 },
            new() { Id = Guid.NewGuid(), Name = "OpenRouter", Type = "OpenRouter", BaseUrl = "https://openrouter.ai/api/v1", IsActive = true, Priority = 8, AuthType = "Bearer", RateLimit = 200, Timeout = 120 },
            new() { Id = Guid.NewGuid(), Name = "Ollama", Type = "Ollama", BaseUrl = "http://localhost:11434", IsActive = true, Priority = 9, AuthType = "None", Timeout = 300 },
            new() { Id = Guid.NewGuid(), Name = "LM Studio", Type = "LMStudio", BaseUrl = "http://localhost:1234", IsActive = true, Priority = 10, AuthType = "None", Timeout = 300 },
            new() { Id = Guid.NewGuid(), Name = "Cohere", Type = "Cohere", BaseUrl = "https://api.cohere.com/v2", IsActive = true, Priority = 11, AuthType = "Bearer", RateLimit = 500, Timeout = 60 },
            new() { Id = Guid.NewGuid(), Name = "Cerebras", Type = "Cerebras", BaseUrl = "https://api.cerebras.ai/v1", IsActive = true, Priority = 12, AuthType = "Bearer", RateLimit = 500, Timeout = 60 },
            new() { Id = Guid.NewGuid(), Name = "Cloudflare Workers AI", Type = "Cloudflare", BaseUrl = "https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/run", IsActive = true, Priority = 13, AuthType = "Bearer", RateLimit = 500, Timeout = 60 },
            new() { Id = Guid.NewGuid(), Name = "GitHub Models", Type = "GitHub", BaseUrl = "https://models.github.ai/inference", IsActive = true, Priority = 14, AuthType = "Bearer", RateLimit = 100, Timeout = 60 },
            new() { Id = Guid.NewGuid(), Name = "Hugging Face", Type = "HuggingFace", BaseUrl = "https://router.huggingface.co/v1", IsActive = true, Priority = 15, AuthType = "Bearer", RateLimit = 100, Timeout = 120 },
            new() { Id = Guid.NewGuid(), Name = "Kilo Code", Type = "KiloCode", BaseUrl = "https://api.kilo.ai/api/gateway", IsActive = true, Priority = 16, AuthType = "Bearer", RateLimit = 10, Timeout = 30 },
            new() { Id = Guid.NewGuid(), Name = "LLM7", Type = "LLM7", BaseUrl = "https://api.llm7.io/v1", IsActive = true, Priority = 17, AuthType = "Bearer", RateLimit = 60, Timeout = 30 },
            new() { Id = Guid.NewGuid(), Name = "ModelScope", Type = "ModelScope", BaseUrl = "https://api-inference.modelscope.cn/v1", IsActive = true, Priority = 18, AuthType = "Bearer", RateLimit = 100, Timeout = 120 },
            new() { Id = Guid.NewGuid(), Name = "NVIDIA NIM", Type = "NVIDIA", BaseUrl = "https://integrate.api.nvidia.com/v1", IsActive = true, Priority = 19, AuthType = "Bearer", RateLimit = 1000, Timeout = 60 },
            new() { Id = Guid.NewGuid(), Name = "OVHcloud", Type = "OVHcloud", BaseUrl = "https://oai.endpoints.kepler.ai.cloud.ovh.net/v1", IsActive = true, Priority = 20, AuthType = "Bearer", RateLimit = 100, Timeout = 60 },
            new() { Id = Guid.NewGuid(), Name = "SambaNova", Type = "SambaNova", BaseUrl = "https://api.sambanova.ai/v1", IsActive = true, Priority = 21, AuthType = "Bearer", RateLimit = 30, Timeout = 120 },
            new() { Id = Guid.NewGuid(), Name = "SiliconFlow", Type = "SiliconFlow", BaseUrl = "https://api.siliconflow.cn/v1", IsActive = true, Priority = 22, AuthType = "Bearer", RateLimit = 200, Timeout = 120 },
            new() { Id = Guid.NewGuid(), Name = "Aion Labs", Type = "AionLabs", BaseUrl = "https://api.aionlabs.ai/v1", IsActive = true, Priority = 23, AuthType = "Bearer", RateLimit = 60, Timeout = 60 },
            new() { Id = Guid.NewGuid(), Name = "Zhipu AI (ZAI)", Type = "ZAI", BaseUrl = "https://open.bigmodel.cn/api/paas/v4", IsActive = true, Priority = 24, AuthType = "Bearer", RateLimit = 100, Timeout = 120 },
        };
    }

    private static List<AIModel> GetModels(List<Provider> providers)
    {
        var models = new List<AIModel>();

        var openAi = providers[0];
        models.AddRange(new[]
        {
            new AIModel { Id = Guid.NewGuid(), ProviderId = openAi.Id, Name = "gpt-4o", DisplayName = "GPT-4o", ActualModelName = "gpt-4o", ContextWindow = 128000, MaxTokens = 16384, SupportsVision = true, SupportsFunctionCalling = true, SupportsStreaming = true, Status = ModelStatus.Active, PricePerPromptToken = 0.0025m, PricePerCompletionToken = 0.01m },
            new AIModel { Id = Guid.NewGuid(), ProviderId = openAi.Id, Name = "gpt-4o-mini", DisplayName = "GPT-4o Mini", ActualModelName = "gpt-4o-mini", ContextWindow = 128000, MaxTokens = 16384, SupportsVision = true, SupportsFunctionCalling = true, SupportsStreaming = true, Status = ModelStatus.Active, PricePerPromptToken = 0.00015m, PricePerCompletionToken = 0.0006m },
            new AIModel { Id = Guid.NewGuid(), ProviderId = openAi.Id, Name = "gpt-4-turbo", DisplayName = "GPT-4 Turbo", ActualModelName = "gpt-4-turbo", ContextWindow = 128000, MaxTokens = 4096, SupportsVision = true, SupportsFunctionCalling = true, SupportsStreaming = true, Status = ModelStatus.Active, PricePerPromptToken = 0.01m, PricePerCompletionToken = 0.03m },
            new AIModel { Id = Guid.NewGuid(), ProviderId = openAi.Id, Name = "gpt-3.5-turbo", DisplayName = "GPT-3.5 Turbo", ActualModelName = "gpt-3.5-turbo", ContextWindow = 16384, MaxTokens = 4096, SupportsFunctionCalling = true, SupportsStreaming = true, Status = ModelStatus.Active, PricePerPromptToken = 0.0005m, PricePerCompletionToken = 0.0015m, IsFree = true },
        });

        var azure = providers[1];
        models.AddRange(new[]
        {
            new AIModel { Id = Guid.NewGuid(), ProviderId = azure.Id, Name = "gpt-4o", DisplayName = "GPT-4o (Azure)", ActualModelName = "gpt-4o", ContextWindow = 128000, MaxTokens = 16384, SupportsVision = true, SupportsFunctionCalling = true, SupportsStreaming = true, Status = ModelStatus.Active },
            new AIModel { Id = Guid.NewGuid(), ProviderId = azure.Id, Name = "gpt-35-turbo", DisplayName = "GPT-3.5 Turbo (Azure)", ActualModelName = "gpt-35-turbo", ContextWindow = 16384, MaxTokens = 4096, SupportsFunctionCalling = true, SupportsStreaming = true, Status = ModelStatus.Active },
        });

        var claude = providers[2];
        models.AddRange(new[]
        {
            new AIModel { Id = Guid.NewGuid(), ProviderId = claude.Id, Name = "claude-sonnet-4-20250514", DisplayName = "Claude Sonnet 4", ActualModelName = "claude-sonnet-4-20250514", ContextWindow = 200000, MaxTokens = 8192, SupportsVision = true, SupportsStreaming = true, Status = ModelStatus.Active, PricePerPromptToken = 0.003m, PricePerCompletionToken = 0.015m },
            new AIModel { Id = Guid.NewGuid(), ProviderId = claude.Id, Name = "claude-3-5-haiku-20241022", DisplayName = "Claude 3.5 Haiku", ActualModelName = "claude-3-5-haiku-20241022", ContextWindow = 200000, MaxTokens = 8192, SupportsVision = true, SupportsStreaming = true, Status = ModelStatus.Active, PricePerPromptToken = 0.0008m, PricePerCompletionToken = 0.004m },
            new AIModel { Id = Guid.NewGuid(), ProviderId = claude.Id, Name = "claude-3-opus-20240229", DisplayName = "Claude 3 Opus", ActualModelName = "claude-3-opus-20240229", ContextWindow = 200000, MaxTokens = 4096, SupportsVision = true, SupportsStreaming = true, Status = ModelStatus.Active, PricePerPromptToken = 0.015m, PricePerCompletionToken = 0.075m },
        });

        var gemini = providers[3];
        models.AddRange(new[]
        {
            new AIModel { Id = Guid.NewGuid(), ProviderId = gemini.Id, Name = "gemini-2.5-flash-preview-04-17", DisplayName = "Gemini 2.5 Flash", ActualModelName = "models/gemini-2.5-flash-preview-04-17", ContextWindow = 1048576, MaxTokens = 8192, SupportsVision = true, SupportsAudio = true, SupportsStreaming = true, Status = ModelStatus.Active, PricePerPromptToken = 0.0001m, PricePerCompletionToken = 0.0004m },
            new AIModel { Id = Guid.NewGuid(), ProviderId = gemini.Id, Name = "gemini-2.0-flash-exp", DisplayName = "Gemini 2.0 Flash", ActualModelName = "models/gemini-2.0-flash-exp", ContextWindow = 1048576, MaxTokens = 8192, SupportsVision = true, SupportsStreaming = true, Status = ModelStatus.Active, IsFree = true },
            new AIModel { Id = Guid.NewGuid(), ProviderId = gemini.Id, Name = "gemini-1.5-pro", DisplayName = "Gemini 1.5 Pro", ActualModelName = "models/gemini-1.5-pro", ContextWindow = 2097152, MaxTokens = 8192, SupportsVision = true, SupportsAudio = true, SupportsStreaming = true, Status = ModelStatus.Active, PricePerPromptToken = 0.00125m, PricePerCompletionToken = 0.005m },
            new AIModel { Id = Guid.NewGuid(), ProviderId = gemini.Id, Name = "gemini-1.5-flash", DisplayName = "Gemini 1.5 Flash", ActualModelName = "models/gemini-1.5-flash", ContextWindow = 1048576, MaxTokens = 8192, SupportsVision = true, SupportsStreaming = true, Status = ModelStatus.Active, PricePerPromptToken = 0.000075m, PricePerCompletionToken = 0.0003m, IsFree = true },
        });

        var deepSeek = providers[4];
        models.AddRange(new[]
        {
            new AIModel { Id = Guid.NewGuid(), ProviderId = deepSeek.Id, Name = "deepseek-chat", DisplayName = "DeepSeek Chat", ActualModelName = "deepseek-chat", ContextWindow = 65536, MaxTokens = 8192, SupportsStreaming = true, Status = ModelStatus.Active, PricePerPromptToken = 0.0001m, PricePerCompletionToken = 0.0005m, IsFree = true },
            new AIModel { Id = Guid.NewGuid(), ProviderId = deepSeek.Id, Name = "deepseek-reasoner", DisplayName = "DeepSeek Reasoner", ActualModelName = "deepseek-reasoner", ContextWindow = 65536, MaxTokens = 8192, SupportsStreaming = true, Status = ModelStatus.Active, PricePerPromptToken = 0.0005m, PricePerCompletionToken = 0.0025m },
            new AIModel { Id = Guid.NewGuid(), ProviderId = deepSeek.Id, Name = "deepseek-coder", DisplayName = "DeepSeek Coder", ActualModelName = "deepseek-coder", ContextWindow = 16384, MaxTokens = 4096, SupportsFunctionCalling = true, SupportsStreaming = true, Status = ModelStatus.Active, PricePerPromptToken = 0.0001m, PricePerCompletionToken = 0.0005m, IsFree = true },
        });

        var groq = providers[5];
        models.AddRange(new[]
        {
            new AIModel { Id = Guid.NewGuid(), ProviderId = groq.Id, Name = "llama-3.3-70b-versatile", DisplayName = "Llama 3.3 70B", ActualModelName = "llama-3.3-70b-versatile", ContextWindow = 131072, MaxTokens = 32768, SupportsFunctionCalling = true, SupportsStreaming = true, Status = ModelStatus.Active, IsFree = true, TpmLimit = 12000, TpdLimit = 200000, RpmLimit = 60, MaxConcurrency = 8 },
            new AIModel { Id = Guid.NewGuid(), ProviderId = groq.Id, Name = "mixtral-8x7b-32768", DisplayName = "Mixtral 8x7B", ActualModelName = "mixtral-8x7b-32768", ContextWindow = 32768, MaxTokens = 16384, SupportsStreaming = true, Status = ModelStatus.Active, IsFree = true },
            new AIModel { Id = Guid.NewGuid(), ProviderId = groq.Id, Name = "gemma2-9b-it", DisplayName = "Gemma 2 9B", ActualModelName = "gemma2-9b-it", ContextWindow = 8192, MaxTokens = 4096, SupportsStreaming = true, Status = ModelStatus.Active, IsFree = true },
            new AIModel { Id = Guid.NewGuid(), ProviderId = groq.Id, Name = "llama-3.1-8b-instant", DisplayName = "Llama 3.1 8B", ActualModelName = "llama-3.1-8b-instant", ContextWindow = 8192, MaxTokens = 4096, SupportsStreaming = true, Status = ModelStatus.Active, IsFree = true },
            new AIModel { Id = Guid.NewGuid(), ProviderId = groq.Id, Name = "canopylabs/orpheus-arabic-saudi", DisplayName = "Orpheus Arabic Saudi", ActualModelName = "canopylabs/orpheus-arabic-saudi", ContextWindow = 8192, MaxTokens = 4096, SupportsStreaming = true, Status = ModelStatus.Active, IsFree = true },
            new AIModel { Id = Guid.NewGuid(), ProviderId = groq.Id, Name = "canopylabs/orpheus-v1-english", DisplayName = "Orpheus V1 English", ActualModelName = "canopylabs/orpheus-v1-english", ContextWindow = 8192, MaxTokens = 4096, SupportsStreaming = true, Status = ModelStatus.Active, IsFree = true },
            new AIModel { Id = Guid.NewGuid(), ProviderId = groq.Id, Name = "groq/compound", DisplayName = "Groq Compound", ActualModelName = "groq/compound", ContextWindow = 131072, MaxTokens = 32768, SupportsFunctionCalling = true, SupportsStreaming = true, Status = ModelStatus.Active, IsFree = true },
            new AIModel { Id = Guid.NewGuid(), ProviderId = groq.Id, Name = "groq/compound-mini", DisplayName = "Groq Compound Mini", ActualModelName = "groq/compound-mini", ContextWindow = 131072, MaxTokens = 32768, SupportsFunctionCalling = true, SupportsStreaming = true, Status = ModelStatus.Active, IsFree = true },
            new AIModel { Id = Guid.NewGuid(), ProviderId = groq.Id, Name = "meta-llama/llama-prompt-guard-2-22m", DisplayName = "Llama Prompt Guard 2 22M", ActualModelName = "meta-llama/llama-prompt-guard-2-22m", ContextWindow = 8192, MaxTokens = 4096, SupportsStreaming = true, Status = ModelStatus.Active, IsFree = true },
            new AIModel { Id = Guid.NewGuid(), ProviderId = groq.Id, Name = "meta-llama/llama-prompt-guard-2-86m", DisplayName = "Llama Prompt Guard 2 86M", ActualModelName = "meta-llama/llama-prompt-guard-2-86m", ContextWindow = 8192, MaxTokens = 4096, SupportsStreaming = true, Status = ModelStatus.Active, IsFree = true },
            new AIModel { Id = Guid.NewGuid(), ProviderId = groq.Id, Name = "openai/gpt-oss-120b", DisplayName = "GPT OSS 120B", ActualModelName = "openai/gpt-oss-120b", ContextWindow = 131072, MaxTokens = 32768, SupportsFunctionCalling = true, SupportsStreaming = true, Status = ModelStatus.Active, IsFree = true },
            new AIModel { Id = Guid.NewGuid(), ProviderId = groq.Id, Name = "openai/gpt-oss-20b", DisplayName = "GPT OSS 20B", ActualModelName = "openai/gpt-oss-20b", ContextWindow = 131072, MaxTokens = 32768, SupportsFunctionCalling = true, SupportsStreaming = true, Status = ModelStatus.Active, IsFree = true },
            new AIModel { Id = Guid.NewGuid(), ProviderId = groq.Id, Name = "openai/gpt-oss-safeguard-20b", DisplayName = "GPT OSS Safeguard 20B", ActualModelName = "openai/gpt-oss-safeguard-20b", ContextWindow = 8192, MaxTokens = 4096, SupportsStreaming = true, Status = ModelStatus.Active, IsFree = true },
            new AIModel { Id = Guid.NewGuid(), ProviderId = groq.Id, Name = "qwen/qwen3.6-27b", DisplayName = "Qwen 3.6 27B", ActualModelName = "qwen/qwen3.6-27b", ContextWindow = 131072, MaxTokens = 32768, SupportsFunctionCalling = true, SupportsStreaming = true, Status = ModelStatus.Active, IsFree = true, TpmLimit = 8000, TpdLimit = 200000, RpmLimit = 30, MaxConcurrency = 4 },
            new AIModel { Id = Guid.NewGuid(), ProviderId = groq.Id, Name = "whisper-large-v3", DisplayName = "Whisper Large V3", ActualModelName = "whisper-large-v3", ContextWindow = 8192, MaxTokens = 4096, SupportsAudio = true, SupportsStreaming = true, Status = ModelStatus.Active, IsFree = true },
            new AIModel { Id = Guid.NewGuid(), ProviderId = groq.Id, Name = "whisper-large-v3-turbo", DisplayName = "Whisper Large V3 Turbo", ActualModelName = "whisper-large-v3-turbo", ContextWindow = 8192, MaxTokens = 4096, SupportsAudio = true, SupportsStreaming = true, Status = ModelStatus.Active, IsFree = true },
        });

        var mistral = providers[6];
        models.AddRange(new[]
        {
            new AIModel { Id = Guid.NewGuid(), ProviderId = mistral.Id, Name = "mistral-large-latest", DisplayName = "Mistral Large", ActualModelName = "mistral-large-latest", ContextWindow = 128000, MaxTokens = 16384, SupportsFunctionCalling = true, SupportsStreaming = true, Status = ModelStatus.Active, PricePerPromptToken = 0.002m, PricePerCompletionToken = 0.006m },
            new AIModel { Id = Guid.NewGuid(), ProviderId = mistral.Id, Name = "mistral-small-latest", DisplayName = "Mistral Small", ActualModelName = "mistral-small-latest", ContextWindow = 32768, MaxTokens = 8192, SupportsFunctionCalling = true, SupportsStreaming = true, Status = ModelStatus.Active, PricePerPromptToken = 0.001m, PricePerCompletionToken = 0.003m, IsFree = true },
            new AIModel { Id = Guid.NewGuid(), ProviderId = mistral.Id, Name = "codestral-latest", DisplayName = "Codestral", ActualModelName = "codestral-latest", ContextWindow = 32768, MaxTokens = 8192, SupportsFunctionCalling = true, SupportsStreaming = true, Status = ModelStatus.Active, PricePerPromptToken = 0.001m, PricePerCompletionToken = 0.003m, IsFree = true },
        });

        var openRouter = providers[7];
        models.AddRange(new[]
        {
            new AIModel { Id = Guid.NewGuid(), ProviderId = openRouter.Id, Name = "openrouter/auto", DisplayName = "OpenRouter Auto", ActualModelName = "openrouter/auto", ContextWindow = 128000, MaxTokens = 16384, SupportsStreaming = true, Status = ModelStatus.Active, IsFree = true },
            new AIModel { Id = Guid.NewGuid(), ProviderId = openRouter.Id, Name = "anthropic/claude-sonnet", DisplayName = "Claude Sonnet (OpenRouter)", ActualModelName = "anthropic/claude-sonnet", ContextWindow = 200000, MaxTokens = 8192, SupportsStreaming = true, Status = ModelStatus.Active, IsFree = true },
            new AIModel { Id = Guid.NewGuid(), ProviderId = openRouter.Id, Name = "openai/gpt-4o", DisplayName = "GPT-4o (OpenRouter)", ActualModelName = "openai/gpt-4o", ContextWindow = 128000, MaxTokens = 16384, SupportsStreaming = true, Status = ModelStatus.Active, IsFree = true },
        });

        var ollama = providers[8];
        models.AddRange(new[]
        {
            new AIModel { Id = Guid.NewGuid(), ProviderId = ollama.Id, Name = "llama3.1", DisplayName = "Llama 3.1", ActualModelName = "llama3.1", ContextWindow = 8192, MaxTokens = 4096, SupportsStreaming = true, Status = ModelStatus.Active, IsFree = true },
            new AIModel { Id = Guid.NewGuid(), ProviderId = ollama.Id, Name = "mistral", DisplayName = "Mistral (Ollama)", ActualModelName = "mistral", ContextWindow = 8192, MaxTokens = 4096, SupportsStreaming = true, Status = ModelStatus.Active, IsFree = true },
            new AIModel { Id = Guid.NewGuid(), ProviderId = ollama.Id, Name = "codellama", DisplayName = "Code Llama", ActualModelName = "codellama", ContextWindow = 16384, MaxTokens = 4096, SupportsStreaming = true, Status = ModelStatus.Active, IsFree = true },
            new AIModel { Id = Guid.NewGuid(), ProviderId = ollama.Id, Name = "phi3", DisplayName = "Phi-3", ActualModelName = "phi3", ContextWindow = 128000, MaxTokens = 4096, SupportsStreaming = true, Status = ModelStatus.Active, IsFree = true },
        });

        var lmStudio = providers[9];
        models.AddRange(new[]
        {
            new AIModel { Id = Guid.NewGuid(), ProviderId = lmStudio.Id, Name = "local-model", DisplayName = "Local Model (LM Studio)", ActualModelName = "local-model", ContextWindow = 4096, MaxTokens = 2048, SupportsStreaming = true, Status = ModelStatus.Active, IsFree = true },
        });

        var cohere = providers[10];
        models.AddRange(new[]
        {
            new AIModel { Id = Guid.NewGuid(), ProviderId = cohere.Id, Name = "command-r-plus", DisplayName = "Command R+", ActualModelName = "command-r-plus", ContextWindow = 128000, MaxTokens = 4096, SupportsFunctionCalling = true, SupportsStreaming = true, Status = ModelStatus.Active, PricePerPromptToken = 0.003m, PricePerCompletionToken = 0.015m },
            new AIModel { Id = Guid.NewGuid(), ProviderId = cohere.Id, Name = "command-r", DisplayName = "Command R", ActualModelName = "command-r", ContextWindow = 128000, MaxTokens = 4096, SupportsFunctionCalling = true, SupportsStreaming = true, Status = ModelStatus.Active, PricePerPromptToken = 0.0005m, PricePerCompletionToken = 0.0015m },
            new AIModel { Id = Guid.NewGuid(), ProviderId = cohere.Id, Name = "command-light", DisplayName = "Command Light", ActualModelName = "command-light", ContextWindow = 4096, MaxTokens = 1024, SupportsStreaming = true, Status = ModelStatus.Active, IsFree = true },
        });

        var cerebras = providers[11];
        models.AddRange(new[]
        {
            new AIModel { Id = Guid.NewGuid(), ProviderId = cerebras.Id, Name = "llama-3.3-70b", DisplayName = "Llama 3.3 70B (Cerebras)", ActualModelName = "llama3.1-70b", ContextWindow = 8192, MaxTokens = 4096, SupportsStreaming = true, Status = ModelStatus.Active, IsFree = true },
            new AIModel { Id = Guid.NewGuid(), ProviderId = cerebras.Id, Name = "llama-3.1-8b", DisplayName = "Llama 3.1 8B (Cerebras)", ActualModelName = "llama3.1-8b", ContextWindow = 8192, MaxTokens = 4096, SupportsStreaming = true, Status = ModelStatus.Active, IsFree = true },
        });

        var cloudflare = providers[12];
        models.AddRange(new[]
        {
            new AIModel { Id = Guid.NewGuid(), ProviderId = cloudflare.Id, Name = "@cf/meta/llama-3.1-70b-instruct", DisplayName = "Llama 3.1 70B (Cloudflare)", ActualModelName = "@cf/meta/llama-3.1-70b-instruct", ContextWindow = 8192, MaxTokens = 4096, SupportsStreaming = true, Status = ModelStatus.Active, IsFree = true },
            new AIModel { Id = Guid.NewGuid(), ProviderId = cloudflare.Id, Name = "@cf/meta/llama-3.1-8b-instruct", DisplayName = "Llama 3.1 8B (Cloudflare)", ActualModelName = "@cf/meta/llama-3.1-8b-instruct", ContextWindow = 8192, MaxTokens = 4096, SupportsStreaming = true, Status = ModelStatus.Active, IsFree = true },
            new AIModel { Id = Guid.NewGuid(), ProviderId = cloudflare.Id, Name = "@hf/google/gemma-2-9b-it", DisplayName = "Gemma 2 9B (Cloudflare)", ActualModelName = "@hf/google/gemma-2-9b-it", ContextWindow = 8192, MaxTokens = 4096, SupportsStreaming = true, Status = ModelStatus.Active, IsFree = true },
            new AIModel { Id = Guid.NewGuid(), ProviderId = cloudflare.Id, Name = "@hf/microsoft/phi-3.5-mini-instruct", DisplayName = "Phi-3.5 Mini (Cloudflare)", ActualModelName = "@hf/microsoft/phi-3.5-mini-instruct", ContextWindow = 128000, MaxTokens = 4096, SupportsStreaming = true, Status = ModelStatus.Active, IsFree = true },
        });

        var github = providers[13];
        models.AddRange(new[]
        {
            new AIModel { Id = Guid.NewGuid(), ProviderId = github.Id, Name = "gpt-4o", DisplayName = "GPT-4o (GitHub)", ActualModelName = "gpt-4o", ContextWindow = 128000, MaxTokens = 16384, SupportsVision = true, SupportsFunctionCalling = true, SupportsStreaming = true, Status = ModelStatus.Active },
            new AIModel { Id = Guid.NewGuid(), ProviderId = github.Id, Name = "gpt-4o-mini", DisplayName = "GPT-4o Mini (GitHub)", ActualModelName = "gpt-4o-mini", ContextWindow = 128000, MaxTokens = 16384, SupportsVision = true, SupportsStreaming = true, Status = ModelStatus.Active },
            new AIModel { Id = Guid.NewGuid(), ProviderId = github.Id, Name = "Phi-3.5-mini-instruct", DisplayName = "Phi-3.5 Mini (GitHub)", ActualModelName = "Phi-3.5-mini-instruct", ContextWindow = 128000, MaxTokens = 4096, SupportsStreaming = true, Status = ModelStatus.Active, IsFree = true },
        });

        var huggingFace = providers[14];
        models.AddRange(new[]
        {
            new AIModel { Id = Guid.NewGuid(), ProviderId = huggingFace.Id, Name = "meta-llama/Llama-3.1-70B-Instruct", DisplayName = "Llama 3.1 70B (HF)", ActualModelName = "meta-llama/Llama-3.1-70B-Instruct", ContextWindow = 8192, MaxTokens = 4096, SupportsStreaming = true, Status = ModelStatus.Active },
            new AIModel { Id = Guid.NewGuid(), ProviderId = huggingFace.Id, Name = "microsoft/Phi-3.5-mini-instruct", DisplayName = "Phi-3.5 Mini (HF)", ActualModelName = "microsoft/Phi-3.5-mini-instruct", ContextWindow = 128000, MaxTokens = 4096, SupportsStreaming = true, Status = ModelStatus.Active, IsFree = true },
            new AIModel { Id = Guid.NewGuid(), ProviderId = huggingFace.Id, Name = "mistralai/Mistral-7B-Instruct-v0.3", DisplayName = "Mistral 7B (HF)", ActualModelName = "mistralai/Mistral-7B-Instruct-v0.3", ContextWindow = 32768, MaxTokens = 4096, SupportsStreaming = true, Status = ModelStatus.Active, IsFree = true },
            new AIModel { Id = Guid.NewGuid(), ProviderId = huggingFace.Id, Name = "microsoft/Phi-3-medium-4k-instruct", DisplayName = "Phi-3 Medium (HF)", ActualModelName = "microsoft/Phi-3-medium-4k-instruct", ContextWindow = 4096, MaxTokens = 4096, SupportsStreaming = true, Status = ModelStatus.Active, IsFree = true },
        });

        var kiloCode = providers[15];
        models.AddRange(new[]
        {
            new AIModel { Id = Guid.NewGuid(), ProviderId = kiloCode.Id, Name = "kilo-code-v1", DisplayName = "Kilo Code v1", ActualModelName = "kilo-code-v1", ContextWindow = 32768, MaxTokens = 8192, SupportsStreaming = true, Status = ModelStatus.Active },
        });

        var llm7 = providers[16];
        models.AddRange(new[]
        {
            new AIModel { Id = Guid.NewGuid(), ProviderId = llm7.Id, Name = "llm7-chat", DisplayName = "LLM7 Chat", ActualModelName = "llm7-chat", ContextWindow = 16384, MaxTokens = 4096, SupportsStreaming = true, Status = ModelStatus.Active },
        });

        var modelScope = providers[17];
        models.AddRange(new[]
        {
            new AIModel { Id = Guid.NewGuid(), ProviderId = modelScope.Id, Name = "Qwen/Qwen2.5-72B-Instruct", DisplayName = "Qwen 2.5 72B", ActualModelName = "Qwen/Qwen2.5-72B-Instruct", ContextWindow = 32768, MaxTokens = 8192, SupportsStreaming = true, Status = ModelStatus.Active, IsFree = true },
            new AIModel { Id = Guid.NewGuid(), ProviderId = modelScope.Id, Name = "Qwen/Qwen2.5-7B-Instruct", DisplayName = "Qwen 2.5 7B", ActualModelName = "Qwen/Qwen2.5-7B-Instruct", ContextWindow = 32768, MaxTokens = 8192, SupportsStreaming = true, Status = ModelStatus.Active, IsFree = true },
        });

        var nvidia = providers[18];
        models.AddRange(new[]
        {
            new AIModel { Id = Guid.NewGuid(), ProviderId = nvidia.Id, Name = "meta/llama-3.1-70b-instruct", DisplayName = "Llama 3.1 70B (NVIDIA)", ActualModelName = "meta/llama-3.1-70b-instruct", ContextWindow = 131072, MaxTokens = 4096, SupportsStreaming = true, Status = ModelStatus.Active },
            new AIModel { Id = Guid.NewGuid(), ProviderId = nvidia.Id, Name = "mistralai/mistral-7b-instruct-v0.3", DisplayName = "Mistral 7B (NVIDIA)", ActualModelName = "mistralai/mistral-7b-instruct-v0.3", ContextWindow = 32768, MaxTokens = 4096, SupportsStreaming = true, Status = ModelStatus.Active, IsFree = true },
            new AIModel { Id = Guid.NewGuid(), ProviderId = nvidia.Id, Name = "nvidia/llama-3.1-nemotron-70b-instruct", DisplayName = "Nemotron 70B", ActualModelName = "nvidia/llama-3.1-nemotron-70b-instruct", ContextWindow = 131072, MaxTokens = 4096, SupportsStreaming = true, Status = ModelStatus.Active },
        });

        var ovh = providers[19];
        models.AddRange(new[]
        {
            new AIModel { Id = Guid.NewGuid(), ProviderId = ovh.Id, Name = "Meta-Llama-3.1-70B-Instruct", DisplayName = "Llama 3.1 70B (OVH)", ActualModelName = "Meta-Llama-3.1-70B-Instruct", ContextWindow = 8192, MaxTokens = 4096, SupportsStreaming = true, Status = ModelStatus.Active, IsFree = true },
            new AIModel { Id = Guid.NewGuid(), ProviderId = ovh.Id, Name = "Mistral-7B-Instruct-v0.3", DisplayName = "Mistral 7B (OVH)", ActualModelName = "Mistral-7B-Instruct-v0.3", ContextWindow = 32768, MaxTokens = 4096, SupportsStreaming = true, Status = ModelStatus.Active, IsFree = true },
        });

        var sambanova = providers[20];
        models.AddRange(new[]
        {
            new AIModel { Id = Guid.NewGuid(), ProviderId = sambanova.Id, Name = "Meta-Llama-3.1-70B-Instruct", DisplayName = "Llama 3.1 70B (SambaNova)", ActualModelName = "Meta-Llama-3.1-70B-Instruct", ContextWindow = 8192, MaxTokens = 4096, SupportsStreaming = true, Status = ModelStatus.Active, IsFree = true },
            new AIModel { Id = Guid.NewGuid(), ProviderId = sambanova.Id, Name = "Meta-Llama-3.1-8B-Instruct", DisplayName = "Llama 3.1 8B (SambaNova)", ActualModelName = "Meta-Llama-3.1-8B-Instruct", ContextWindow = 8192, MaxTokens = 4096, SupportsStreaming = true, Status = ModelStatus.Active, IsFree = true },
        });

        var siliconFlow = providers[21];
        models.AddRange(new[]
        {
            new AIModel { Id = Guid.NewGuid(), ProviderId = siliconFlow.Id, Name = "deepseek-ai/DeepSeek-V3", DisplayName = "DeepSeek V3 (SiliconFlow)", ActualModelName = "deepseek-ai/DeepSeek-V3", ContextWindow = 65536, MaxTokens = 8192, SupportsStreaming = true, Status = ModelStatus.Active, IsFree = true },
            new AIModel { Id = Guid.NewGuid(), ProviderId = siliconFlow.Id, Name = "Qwen/Qwen2.5-72B-Instruct", DisplayName = "Qwen 2.5 72B (SiliconFlow)", ActualModelName = "Qwen/Qwen2.5-72B-Instruct", ContextWindow = 32768, MaxTokens = 8192, SupportsStreaming = true, Status = ModelStatus.Active, IsFree = true },
            new AIModel { Id = Guid.NewGuid(), ProviderId = siliconFlow.Id, Name = "meta-llama/Meta-Llama-3.1-70B-Instruct", DisplayName = "Llama 3.1 70B (SiliconFlow)", ActualModelName = "meta-llama/Meta-Llama-3.1-70B-Instruct", ContextWindow = 8192, MaxTokens = 4096, SupportsStreaming = true, Status = ModelStatus.Active, IsFree = true },
        });

        var aionLabs = providers[22];
        models.AddRange(new[]
        {
            new AIModel { Id = Guid.NewGuid(), ProviderId = aionLabs.Id, Name = "aion-1", DisplayName = "Aion 1", ActualModelName = "aion-1", ContextWindow = 32768, MaxTokens = 8192, SupportsStreaming = true, Status = ModelStatus.Active, IsFree = true },
        });

        var zai = providers[23];
        models.AddRange(new[]
        {
            new AIModel { Id = Guid.NewGuid(), ProviderId = zai.Id, Name = "glm-4-plus", DisplayName = "GLM-4 Plus", ActualModelName = "glm-4-plus", ContextWindow = 128000, MaxTokens = 4096, SupportsFunctionCalling = true, SupportsStreaming = true, Status = ModelStatus.Active },
            new AIModel { Id = Guid.NewGuid(), ProviderId = zai.Id, Name = "glm-4-air", DisplayName = "GLM-4 Air", ActualModelName = "glm-4-air", ContextWindow = 128000, MaxTokens = 4096, SupportsStreaming = true, Status = ModelStatus.Active },
            new AIModel { Id = Guid.NewGuid(), ProviderId = zai.Id, Name = "glm-4-flash", DisplayName = "GLM-4 Flash", ActualModelName = "glm-4-flash", ContextWindow = 128000, MaxTokens = 4096, SupportsStreaming = true, Status = ModelStatus.Active, IsFree = true },
        });

        return models;
    }
}
