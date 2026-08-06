# AI Gateway - Project Memory

## Memory Auto-Save Rules

- **`memory.md` is the persistent memory file** for this project. It is the single source of truth for what has been done across chat sessions.
- **On chat close**: When the user closes the chat / ends the session, or says goodbye / "close chat" / "save memory", **automatically update `memory.md`** before finishing.
- **On session start**: Always read `memory.md` first to load the Last Session and Pending Tasks sections, so work resumes where it stopped.
- **What to record**: Update the `Last Session` section (date, topic, completed, in-progress, next steps) and append a row to the `Session Log` table. Add unresolved issues to `Known Issues` and unfinished work to `Pending Tasks`.
- **Keep it concise**: Only store durable facts, decisions, bugs, and next steps. Do not log trivial chatter.
- **Never delete history**: Append/overwrite the `Last Session` block; preserve the `Session Log` history.

## Project Overview

AI Gateway is a full-stack application for managing and routing AI API requests across multiple providers. It exposes an OpenAI-compatible gateway endpoint (`/gateway/chat/completions`) that can be used as an LLM provider by other tools (e.g. opencode via `opencode.json`), plus a management dashboard.

Backend is ASP.NET Core 8 Clean Architecture; frontend is React 19 + MUI. The gateway accepts both JWT Bearer tokens and long-lived API keys, tracks per-model rate limits, records usage, and supports reasoning/thinking streaming.

## Repository Layout

```
provider/
├── backend/                  .NET 8 solution (AIGateway.sln)
│   └── src/
│       ├── AIGateway.Domain/         Entities, Enums, Interfaces (AIModel, Provider, UsageRecord, ...)
│       ├── AIGateway.Application/    CQRS commands/queries, DTOs, interfaces, DI
│       ├── AIGateway.Infrastructure/ AiProviderService, ModelRateLimiter, RedisCacheService, AuthService, DI
│       ├── AIGateway.Persistence/    AppDbContext, DbSeeder, UnitOfWork, Repository
│       └── AIGateway.API/            Controllers, Middleware, Program.cs
├── frontend/                 React 19 + Vite SPA
│   └── src/
│       ├── pages/            One page per module (Dashboard, Providers, Models, Usage, Playground, ...)
│       ├── api/              Axios client (baseURL /api, JWT refresh interceptor), endpoints
│       ├── store/            Zustand authStore
│       ├── routes/           AppRoutes (private routes + /login)
│       └── theme/            MUI theme
├── docker/                   Docker Compose infra (SQL Server, Redis, Nginx)
├── docs/                     Playground docs
├── *.ps1                     Manual test scripts (test-login, test-usage, ...)
├── .env / docker-compose.yml / Dockerfile.api / Dockerfile.react
├── aigateway.db*             Local SQLite artifact (NOT used in normal runs - see Remote DB below)
└── opencode.json             Points opencode's "nexgateway" provider at http://localhost:5005/gateway
```

## File-by-File Reference

### Backend - Domain (`backend/src/AIGateway.Domain`)

- `Enums/UserRole.cs` - Role hierarchy `SuperAdmin`, `Admin`, `User` used for authorization
- `Enums/ProviderType.cs` - Enum of supported AI provider types (OpenAI, Claude, Gemini, Groq, Ollama, etc.)
- `Enums/PlanType.cs` - Subscription plans: `Free`, `Starter`, `Professional`, `Enterprise`
- `Enums/PermissionType.cs` - Permission flags (ViewModels, CreateModels, Billing, Analytics, etc.)
- `Enums/ModelStatus.cs` - Model lifecycle: `Active`, `Inactive`, `Deprecated`
- `Enums/ApiKeyStatus.cs` - API key lifecycle: `Active`, `Inactive`, `Expired`, `Revoked`
- `Entities/User.cs` - App user entity: credentials, role, plan, credits, Stripe customer ID
- `Entities/UsageRecord.cs` - One gateway request: tokens, cost, latency, success flag, request/response payloads
- `Entities/Setting.cs` - Key/value app configuration entity
- `Entities/RefreshToken.cs` - JWT refresh token storage with expiry + revocation flag
- `Entities/ProviderType.cs` - Named provider type/category entity
- `Entities/Provider.cs` - External AI provider config: base URL, API key, auth, templates, priority, timeout
- `Entities/PromptTemplate.cs` - Reusable prompt templates with category, tags, public/favorite flags
- `Entities/Invoice.cs` - Billing invoice entity (amount, status, Stripe ID)
- `Entities/AuditLog.cs` - Auditable actions with old/new values and IP address
- `Entities/ApiKey.cs` - Long-lived `sk_` gateway API key with quota, rate limit, IP whitelist
- `Entities/AIModel.cs` - Model capabilities, pricing, status, and per-model limits (TPM/TPD/RPM/concurrency)
- `Interfaces/IUnitOfWork.cs` - Transactions, save, and generic repository access abstraction
- `Interfaces/IRepository.cs` - Generic CRUD repository interface

### Backend - Application (`backend/src/AIGateway.Application`)

- `DependencyInjection.cs` - Registers MediatR handlers + FluentValidation validators from assembly
- `DTOs/UsageDtos.cs` - Usage summary, daily chart, per-provider usage, usage record responses
- `DTOs/SettingDto.cs` - Settings read/update records
- `DTOs/ProviderTypeDtos.cs` - Provider type list/create records
- `DTOs/ProviderDtos.cs` - Provider create/update/read records with nested model lists
- `DTOs/PromptTemplateDtos.cs` - Prompt template create/read records
- `DTOs/ModelDtos.cs` - Model create/update/read records with rate-limit fields
- `DTOs/ChatDtos.cs` - OpenAI-compatible chat request/response records (tools, streaming deltas, reasoning_content)
- `DTOs/BillingDtos.cs` - Plan definitions and invoice response records
- `DTOs/AuthDtos.cs` - Login, register, auth response, refresh, password reset records
- `DTOs/AuditLogDto.cs` - Paged audit log list item record
- `DTOs/ApiKeyDtos.cs` - API key create/list records + full key view
- `DTOs/AnalyticsDtos.cs` - Analytics overview, top models, top users records
- `DTOs/AdminDtos.cs` - Admin user listing + user-role update records
- `Interfaces/IAiProviderService.cs` - Contract for streaming/non-streaming chat + model testing
- `Interfaces/IAuthService.cs` - Contract for login/register/refresh/revoke/password reset
- `Interfaces/ICacheService.cs` - Generic key/value cache abstraction
- `Interfaces/IModelRateLimiter.cs` - Per-model rate-limit acquisition/release contract
- `Admin/Queries/GetUsersQuery.cs` - Lists all users as admin DTOs
- `Admin/Commands/UpdateUserRoleCommand.cs` - Changes a user's role
- `Analytics/Queries/GetAnalyticsOverviewQuery.cs` - Global analytics totals (requests, users, tokens, revenue, latency)
- `ApiKeys/Commands/CreateApiKeyCommand.cs` - Generates `sk_live_` key and persists for a user
- `ApiKeys/Commands/DeleteApiKeyCommand.cs` - Deletes user's API key (ownership-checked)
- `ApiKeys/Queries/GetApiKeysQuery.cs` - Lists user's API keys without secret
- `Auth/Commands/LoginCommand.cs` / `RefreshTokenCommand.cs` / `RegisterCommand.cs` - MediatR wrappers delegating to `IAuthService`
- `Auth/Queries/GetProfileQuery.cs` - Returns current user's profile DTO
- `Billing/Queries/GetInvoicesQuery.cs` - Lists a user's invoices
- `Logs/Queries/GetAuditLogsQuery.cs` - Paged audit logs, newest first
- `Models/Commands/CreateModelCommand.cs` / `UpdateModelCommand.cs` / `DeleteModelCommand.cs` - Model CRUD incl. status + rate limits
- `Models/Queries/GetModelsQuery.cs` - Lists models, optionally filtered by provider
- `PromptTemplates/Commands/CreatePromptTemplateCommand.cs` / `Queries/GetPromptTemplatesQuery.cs` - Template create/list (own + public)
- `Providers/Commands/CreateProviderCommand.cs` / `UpdateProviderCommand.cs` / `DeleteProviderCommand.cs` - Provider CRUD incl. nested models
- `Providers/Queries/GetProvidersQuery.cs` - Lists providers including their models
- `ProviderTypes/Commands/CreateProviderTypeCommand.cs` / `DeleteProviderTypeCommand.cs` / `Queries/GetProviderTypesQuery.cs` - Provider type CRUD
- `Settings/Commands/UpdateSettingCommand.cs` / `Queries/GetSettingsQuery.cs` - Settings read/update
- `Usage/Queries/GetUsageChartsQuery.cs` - Daily usage aggregation for charting
- `Usage/Queries/GetUsageRecordsQuery.cs` - Paged usage records with optional day filter (UTC)
- `Usage/Queries/GetUsageSummaryQuery.cs` - Per-user usage totals (requests, tokens, cost, errors, active keys)

### Backend - Infrastructure (`backend/src/AIGateway.Infrastructure`)

- `Services/AiProviderService.cs` - Outbound engine: calls upstream providers, streaming, 429/TPM retries + trimming, tool calls, reasoning extraction
- `Services/AuthService.cs` - Login/register/refresh/revoke, SHA256 password hashing, JWT + refresh-token generation
- `Services/ModelRateLimiter.cs` - In-memory per-model concurrency, RPM sliding window, TPD counters
- `Services/RedisCacheService.cs` - `ICacheService` on `IDistributedCache` (Redis or in-memory)
- `DependencyInjection.cs` - Registers JWT bearer auth, distributed cache, infra services

### Backend - Persistence (`backend/src/AIGateway.Persistence`)

- `Data/AppDbContext.cs` - EF Core DbContext: all DbSets, fluent config, indexes, relationships
- `Data/DbSeeder.cs` - Seeds provider types, admin/demo users, API key, 24 providers ~100 models, usage, templates, invoices, settings
- `Repositories/Repository.cs` - Generic EF Core repository (GetById/GetAll/Find/Add/Update/Delete + IQueryable)
- `UnitOfWork.cs` - Caches per-entity repositories, SaveChanges, transactions
- `DependencyInjection.cs` - Registers AppDbContext (SQL Server or SQLite) + scoped IUnitOfWork

### Backend - API (`backend/src/AIGateway.API`)

- `Program.cs` - Entry point: Serilog, DI, controllers, Swagger, CORS, EnsureCreated + DbSeeder, middleware pipeline
- `Middleware/RequestLoggingMiddleware.cs` - Logs method, path, status, elapsed ms per request
- `Middleware/ExceptionMiddleware.cs` - Global JSON 500 handler (stack trace only in Development)
- `Middleware/ApiKeyMiddleware.cs` - Authenticates `sk_` keys on `POST /api/chat` + `/gateway/chat/completions`; sets `HttpContext.Items`
- `Controllers/AuthController.cs` - Public login/register/refresh + authorized profile
- `Controllers/GatewayController.cs` - OpenAI-compatible `/gateway/chat/completions` (SSE + non-stream), usage logging
- `Controllers/ChatController.cs` - Authorized `/api/chat` OpenAI-compatible proxy (Playground path)
- `Controllers/ProvidersController.cs` / `ModelsController.cs` / `ProviderTypesController.cs` - Provider/model CRUD + `{id}/test`
- `Controllers/ApiKeysController.cs` - User API key list/create/delete
- `Controllers/UsageController.cs` - Usage summary, chart series (`days`), paged records
- `Controllers/AnalyticsController.cs` - Admin-only analytics overview
- `Controllers/BillingController.cs` - Current user's invoices
- `Controllers/AdminController.cs` - Admin-only user list + role update
- `Controllers/SettingsController.cs` - Admin-only settings read/update
- `Controllers/LogsController.cs` - Admin-only paged audit logs
- `Controllers/PromptTemplatesController.cs` - Prompt template list/create
- `appsettings.json` - Serilog, remote SQL Server conn, `DatabaseProvider: sqlserver`, JWT, CORS
- `appsettings.Development.json` - Dev-only log level overrides
- `Properties/launchSettings.json` - Launch profile `http://localhost:5005` + IIS Express

### Frontend (`frontend/src`)

- `main.tsx` - React entry point mounting `<App />` in StrictMode
- `App.tsx` - Wraps app in custom ThemeProvider and renders AppRoutes
- `index.css` - Global CSS reset, Roboto font, custom scrollbars
- `App.css` - Leftover Vite starter CSS (unused by MUI app)
- `api/client.ts` - Axios `/api` client: JWT attach, 401 auto-refresh, redirect to /login
- `api/endpoints.ts` - Centralized typed API functions incl. SSE streaming + custom-provider chat
- `api/endpointDocs.ts` - Endpoint documentation catalog for the docs pages
- `context/ThemeContext.tsx` - Light/dark theme toggle persisted in localStorage
- `layouts/MainLayout.tsx` - App shell: AppBar, role-filtered nav drawer, theme toggle, user menu, Outlet
- `routes/AppRoutes.tsx` - Router: public /login + private MainLayout with 15 child routes
- `store/authStore.ts` - Zustand auth state (user/token/refreshToken) persisted to localStorage
- `theme/theme.ts` - MUI lightTheme/darkTheme palettes
- `types/index.ts` - All shared TypeScript interfaces
- `pages/LoginPage.tsx` - Login/register tabs
- `pages/DashboardPage.tsx` - Overview dashboard: metric tiles, charts, recent activity, health panels
- `pages/ProvidersPage.tsx` - Provider CRUD with expandable model rows + type management
- `pages/ModelsPage.tsx` - Model management: analytics view + filterable/sortable table + rate-limit config
- `pages/ApiKeysPage.tsx` - API key generate/list/copy/delete with one-time secret
- `pages/UsagePage.tsx` - Usage stat cards, 30-day chart, paginated request log
- `pages/AnalyticsPage.tsx` - Admin analytics: 11 stat cards, charts, activity feed, error table
- `pages/BillingPage.tsx` - Current plan + invoices table
- `pages/PromptTemplatesPage.tsx` - Template list/search/filter/copy/create
- `pages/PlaygroundPage.tsx` - Interactive chat: streaming, thinking/tool-call panels, parameter controls
- `pages/UsersPage.tsx` - Admin user listing with search + role/status filters
- `pages/SettingsPage.tsx` - Editable system settings key/value pairs
- `pages/LogsPage.tsx` - Paginated audit log table
- `pages/RequestDetailsPage.tsx` - Per-request tracking: stat cards, expandable rows, filters, CSV export
- `pages/EndpointDocsPage.tsx` - Interactive API reference with code examples + SDK config snippets
- `pages/EndpointDetailPage.tsx` - Single-endpoint docs view at `/docs/:id`
- `pages/DocsPage.tsx` - Card-grid endpoint overview by category with search

## Tech Stack

- **Backend**: .NET 8, Clean Architecture (Domain/Application/Infrastructure/Persistence/API), EF Core 8 (SQL Server via `DatabaseProvider: "sqlserver"`), MediatR, AutoMapper, JWT Auth + refresh tokens, Serilog, Swashbuckle
- **Frontend**: React 19, TypeScript ~6.0, Vite 8, MUI v9, Recharts, Zustand, TanStack React Query + React Table, Axios, react-hook-form + zod, react-router-dom v7, react-syntax-highlighter
- **Linting**: `oxlint` (frontend), no backend linter configured
- **Infrastructure**: SQL Server, Redis (optional, `Redis` connection string empty by default), Docker Compose, Nginx

## Architecture Decisions

- CQRS with MediatR for backend command/query separation
- JWT Bearer tokens + refresh tokens for auth; API keys (with `sk_` prefix) authenticated via `ApiKeyMiddleware`
- Zustand for client-side auth state (not server state); TanStack Query for server state
- Axios with interceptors for automatic JWT refresh
- Vite proxy forwards `/api` and `/gateway` to backend (`http://localhost:5005`)
- Gateway is OpenAI-compatible: `POST /gateway/chat/completions`, streaming via SSE (`data:` chunks + `[DONE]`), includes `reasoning_content` in `delta`/`message` for reasoning models
- **Gateway auth**: JWT OR API key accepted; anonymous requests to `/gateway` rejected with 401
- Per-model rate limiting via in-memory `ModelRateLimiter` (singleton): RPM (60s sliding window), TPD (daily counter), concurrency (SemaphoreSlim); per-model TPM enforced as outbound budget trim in `AiProviderService`
- Groq free-tier TPM trimming: gateway auto-trims request to fit model TPM, handles both 413 and 429 TPM errors (`IsTpmLimitError`)
- Thinking Mode is opt-in via `settings.enableThinking` (maps to provider `enable_thinking`)
- Groq qwen emits thinking inline as `<think>...</think>` - gateway strips into `reasoning_content`
- `EnsureCreated()` does NOT migrate schema; DB columns are added via manual ALTER TABLE (e.g. per-model rate limit columns)

## SQL & Data Access Patterns

- **No migrations**: `Program.cs` uses `EnsureCreated()` only - it creates the schema but NEVER alters existing tables. All schema changes (e.g. per-model rate limit columns) are applied manually via ALTER TABLE against the remote SQL Server. Keep `EnsureCreated` + manual DDL, do NOT add EF migrations.
- **Bootstrap DDL**: the only raw DDL in code is the `ProviderTypes` bootstrap in `DbSeeder.cs` - probes with `SELECT 1 FROM ProviderTypes`, then `CREATE TABLE` / `CREATE UNIQUE INDEX` if missing (fixes a table EF won't create because it was added to the model after first run).
- **Raw SQL**: only via `context.Database.ExecuteSqlRawAsync(...)` with parameterized args (`@p0`, `@p1`, ...). No `FromSqlRaw` / `SqlQuery` composition anywhere - all reads go through EF Core LINQ.
- **Repository pattern**: reads use `_uow.Repository<T>().Query()` (returns `IQueryable<T>`) composed with LINQ + `Include` for navigations (e.g. `Include(m => m.Provider)` then order by `Provider.Priority` in GatewayController).
- **Pagination**: `Skip((page - 1) * pageSize).Take(pageSize)` with `OrderByDescending` (GetUsageRecordsQuery, GetAuditLogsQuery).
- **Aggregation**: load rows then aggregate in memory (`ToListAsync()` + LINQ `GroupBy`/`Sum`/`Count`) rather than server-side grouping - see GetUsageChartsQuery (`GroupBy(r => r.CreatedAt.Date)` ordered by key) and GetUsageSummaryQuery (counts/sums over the user's records).
- **UTC convention**: every timestamp stored/compared as UTC - `DateTime.UtcNow` on writes, `GETUTCDATE()` as column default, date-range filters built from `DateTime.UtcNow.Date.AddDays(-days)`. `GetUsageRecordsQuery` emits `DateTime.SpecifyKind(..., Utc)` so JSON carries `Z`; frontend `parseUtc()` appends `Z` defensively.
- **SQL Server column types**: `UNIQUEIDENTIFIER` PKs, `NVARCHAR(n)` text, `DATETIME2` timestamps, `DECIMAL(p,s)` money (Cost 18,8 / Credits 18,4 / Amount 18,2), `TrustServerCertificate=True` for the remote host. Table names are EF pluralized (`Users`, `AIModels`, `UsageRecords`). Indexes via `HasIndex` in AppDbContext fluent config or raw DDL.
- **Transactions**: `IUnitOfWork.BeginTransactionAsync / CommitTransactionAsync / RollbackTransactionAsync` (wraps `context.Database.*TransactionAsync`).
- **No stored procedures or views** - all queries are LINQ-to-Entities translated to SQL at runtime.

## Backend Controllers (routes `/api/{controller}` unless noted)

- `AuthController` - login, refresh, register (only controller without `[Authorize]`)
- `ProvidersController` / `ProviderTypesController` / `ModelsController` - provider & model CRUD (include per-model TPM/TPD/RPM/concurrency limits)
- `ApiKeysController` - API key management
- `UsageController` - usage records (filter by `days`)
- `AnalyticsController` - dashboard analytics (requires `SuperAdmin,Admin` roles)
- `BillingController`, `AdminController` (users), `SettingsController`, `LogsController`, `PromptTemplatesController`, `ChatController` (OpenAI-compatible proxy via Playground)
- `GatewayController` (`/gateway`) - the OpenAI-compatible chat completions endpoint (stream + non-stream), usage logging, tool calls, reasoning

## Frontend Pages

Dashboard, Providers, Models, Api Keys, Usage, Analytics, Billing, Prompt Templates, Playground, Users, Settings, Logs, Request Details, Endpoint Docs, Login.

## Known Issues & Fixes Applied

### Port Conflict (Fixed)
- **Problem**: Backend port 5000 was already in use, causing crash on startup
- **Fix**: Changed backend to `http://localhost:5005` in `launchSettings.json`
- **Frontend proxy**: Updated `vite.config.ts` to proxy to `http://localhost:5005`
- **Docker**: Dockerfile.api still uses port 5000 (internal), docker-compose maps accordingly

### Dashboard Error Handling (Fixed)
- **Problem**: Analytics overview endpoint requires `[Authorize(Roles = "SuperAdmin,Admin")]`, causing 403 for regular users. Dashboard's `Promise.all` would fail entirely on any single rejection, showing "Failed to load dashboard data".
- **Fix**: Dashboard now wraps analytics call in a try/catch with fallback `null` instead of `undefined`. Other calls (usage summary, models, providers) work for all authenticated users.

### Docker Compose Password Mismatch (Fixed)
- **Problem**: `.env` used `SA_PASSWORD=Admin@123` but `docker-compose.yml` hardcoded `SA_PASSWORD: "YourPassword123!"`
- **Fix**: Aligned docker-compose to use `Admin@123` consistently

### `Math.Clamp` Crash (Fixed)
- **Problem**: `Math.Clamp(..., 256, maxOut)` threw when `maxTokens` < 256
- **Fix**: min bound changed to `Math.Min(1, maxOut)`

### Duplicate Rate-Limit Error Message (Fixed)
- **Problem**: rate-limit error wrapped model name twice
- **Fix**: single message now

### No-Output with `max_tokens:1` (Fixed)
- **Problem**: tiny output floor produced empty replies
- **Fix**: `PrepareForTpm` reduces tools and enforces a 256-token output floor; retry loops use `IsTpmLimitError`

### UTC Serialization (Fixed)
- **Problem**: `createdAt` was ambiguous (no `Z`); frontend `parseUtc()` now appends `Z` defensively
- **Fix**: `GetUsageRecordsQuery` serializes via `DateTime.SpecifyKind(..., Utc)`

## Remaining Known Issues

- AutoMapper 13.0.1 has a known high-severity vulnerability (build warning NU1903)
- Groq free tier TPM 8000 rate-limits quickly during burst testing (429) - wait ~1min between tests
- `ModelRateLimiter` is in-memory (per-process); limits reset on API restart and TPD does not persist across restarts
- External watcher auto-restarts AIGateway.API (parent PID 13292), causing port races

## Important Conventions

- **No comments in code** unless absolutely necessary
- **No emojis** in code or commit messages
- Backend routes follow `/api/{controller}` pattern (except `/gateway`)
- All controllers (except Auth and `/gateway`) require `[Authorize]`
- Role-based access: SuperAdmin > Admin > User
- Run backend via built EXE with `--urls http://localhost:5005` (avoids stale `dotnet run --no-build` DLLs)
- Per-model limits default when unset: TPM=8000, no TPD/RPM/concurrency unless configured via `ModelRateLimiter`

## Commands

- Backend build: `dotnet build backend/AIGateway.sln`
- Backend run: `backend/src/AIGateway.API/bin/Debug/net8.0/AIGateway.API.exe --urls http://localhost:5005`
- Frontend dev: `npm run dev` (in `frontend/`, port 5173)
- Frontend lint: `npm run lint` (oxlint); build: `npm run build` (tsc -b && vite build)
- Manual tests: `test-login.ps1`, `test-usage.ps1`, etc. in repo root

## Current Port Configuration

- Backend API: `http://localhost:5005`
- Frontend Dev: `http://localhost:5173`
- SQL Server: `localhost:1433` (remote: `202.160.134.3`)
- Redis: `localhost:6379`
- Docker Nginx: port 80

## Remote DB Connection

- The database is hosted on a remote server at `202.160.134.3` (Database `AIGateway`, User `Admin`, password `Admin@123`, `TrustServerCertificate=True`) - this is intentional
- Keep the connection string pointing to this remote server unless running fully local
- `DatabaseProvider: "sqlserver"` in `appsettings.json`; `aigateway.db` in repo root is a stale local artifact, not used in normal runs

## Seed Data

- **SuperAdmin**: admin@aigw.com / Admin@123
- **DemoUser**: demo@aigw.com / Admin@123
- 24 AI providers with models seeded on first run (DbSeeder)
- Seeded model limits: qwen (8K TPM / 200K TPD / 30 RPM / 4 concurrency), llama-3.3 (12K TPM / 200K TPD / 60 RPM / 8 concurrency)
