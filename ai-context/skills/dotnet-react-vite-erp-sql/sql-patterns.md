# SQL / Data Access Pattern Rules

- Database: SQL Server (remote `202.160.134.3`, Database `AIGateway`, `TrustServerCertificate=True`).
- **No EF migrations** — schema created via `EnsureCreated()`, which NEVER alters existing tables. Schema changes (e.g. per-model rate limit columns) are applied manually via ALTER TABLE against the remote DB. Keep `EnsureCreated` + manual DDL.
- Table names are EF-pluralized: `Users`, `AIModels`, `Providers`, `UsageRecords`, `ApiKeys`, `RefreshTokens`, `PromptTemplates`, `Invoices`, `AuditLogs`, `Settings`, `ProviderTypes`.
- PK: `UNIQUEIDENTIFIER`; text `NVARCHAR(n)`; timestamps `DATETIME2`; money `DECIMAL(p,s)` (Cost 18,8 / Credits 18,4 / Amount 18,2).
- **Raw SQL only** via `context.Database.ExecuteSqlRawAsync(...)` with parameterized args (`@p0`, `@p1`, ...). No `FromSqlRaw` / `SqlQuery` composition.
- All reads go through EF Core LINQ using the repository pattern: `_uow.Repository<T>().Query()` (returns `IQueryable<T>`), composed with LINQ + `Include` for navigations.
- Pagination: `Skip((page - 1) * pageSize).Take(pageSize)` with `OrderByDescending` (GetUsageRecordsQuery, GetAuditLogsQuery).
- Aggregation: load rows then aggregate in memory (`ToListAsync()` + LINQ `GroupBy`/`Sum`/`Count`) rather than server-side grouping — see GetUsageChartsQuery, GetUsageSummaryQuery.
- **UTC convention**: `DateTime.UtcNow` on writes, `GETUTCDATE()` as column default, date filters from `DateTime.UtcNow.Date.AddDays(-days)`. `GetUsageRecordsQuery` emits `DateTime.SpecifyKind(..., Utc)` so JSON carries `Z`; frontend `parseUtc()` appends `Z` defensively.
- Indexes via `HasIndex` in `AppDbContext` fluent config or raw DDL.
- Transactions via `IUnitOfWork.BeginTransactionAsync / CommitTransactionAsync / RollbackTransactionAsync`.
- No stored procedures or views — all queries are LINQ-to-Entities translated to SQL at runtime.
- Bootstrap DDL: `ProviderTypes` is the only raw DDL in code — probe `SELECT 1 FROM ProviderTypes`, then `CREATE TABLE` / `CREATE UNIQUE INDEX` if missing (in `DbSeeder.cs`).
