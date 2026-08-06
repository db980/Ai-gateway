# Data Schema

Database: **AIGateway** (SQL Server, remote `202.160.134.3`)  
ORM: EF Core 8 (`AppDbContext`)  
Provider: `DatabaseProvider: "sqlserver"` in `appsettings.json`  
Schema: `EnsureCreated()` creates schema on first run; it NEVER alters existing tables. Schema changes are applied manually via ALTER TABLE against the remote DB. No EF migrations.

## Tables

| Table | Key fields / notes |
|-------|--------------------|
| Users | Email UNIQUE, Username, PasswordHash, Role, Plan, Credits DECIMAL(18,4), StripeCustomerId |
| RefreshTokens | Token (indexed), Expiry, Revoked, FK User (cascade) |
| Providers | Name, BaseUrl, ApiKey, Type, Priority, Timeout, RateLimit, IsActive, ChatEndpointPath (default `chat/completions`) |
| ProviderTypes | Name UNIQUE (bootstrap table — created via raw DDL in DbSeeder, not EF) |
| AIModels | Name, DisplayName, ActualModelName, Status, PricePerPromptToken/CompletionToken DECIMAL(18,8), TpmLimit, TpdLimit, RpmLimit, MaxConcurrency, FK Provider (cascade) |
| ApiKeys | Key UNIQUE, Prefix, Status (Active/Inactive/Expired/Revoked), Quota, RateLimit, IpWhitelist, FK User |
| UsageRecords | UserId, ApiKeyId, ProviderId, ModelId, Prompt/Completion/TotalTokens, Cost DECIMAL(18,8), LatencyMs, IsSuccess, ErrorMessage, IpAddress, Request/ResponseSize, Request/ResponseContent, CreatedAt (indexed) |
| PromptTemplates | Name, Category, Tags, Content, IsPublic, IsFavorite, FK User |
| Invoices | InvoiceNumber, Amount DECIMAL(18,2), Status, StripeId, FK User |
| AuditLogs | Action, Entity, OldValue, NewValue, IpAddress, CreatedAt (indexed) |
| Settings | Key UNIQUE, Value |

## Naming / Types

- PK: `UNIQUEIDENTIFIER`
- Text: `NVARCHAR(n)`; timestamps: `DATETIME2`; money: `DECIMAL(p,s)`
- Table names are EF-pluralized (`Users`, `AIModels`, `UsageRecords`).
- Indexes via `HasIndex` in `AppDbContext.OnModelCreating` fluent config or raw DDL.

## UTC Convention

- Every timestamp stored/comparsed as UTC: `DateTime.UtcNow` on writes, `GETUTCDATE()` as column default.
- Date-range filters built from `DateTime.UtcNow.Date.AddDays(-days)`.
- `GetUsageRecordsQuery` emits `DateTime.SpecifyKind(..., Utc)` so JSON carries `Z`.

## Seeded Data (DbSeeder)

- SuperAdmin `admin@aigw.com` / Admin@123, DemoUser `demo@aigw.com` / Admin@123
- One seeded API key (used by `opencode.json`)
- 24 providers with ~100 models
- Usage records, prompt templates, invoices, settings
- Seeded model limits: qwen (8K TPM / 200K TPD / 30 RPM / 4 concurrency), llama-3.3 (12K TPM / 200K TPD / 60 RPM / 8 concurrency)

## Local artifact

`aigateway.db` (SQLite) in repo root is a stale leftover — not used in normal runs (remote SQL Server is authoritative).
