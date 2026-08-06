# System Architecture

## Technology Stack

| Layer | Technology |
|---|---|
| Backend | .NET 8 Web API, Clean Architecture (Domain / Application / Infrastructure / Persistence / API) |
| ORM | EF Core 8 (SQL Server via `DatabaseProvider: "sqlserver"`) |
| CQRS | MediatR commands/queries per module |
| Mapping | AutoMapper |
| Auth | JWT Bearer (60 min) + refresh tokens; long-lived API keys (`sk_` prefix) via ApiKeyMiddleware |
| Logging | Serilog (Console + rolling file `logs/app-.log`) |
| Docs | Swashbuckle (Swagger) |
| Frontend | React 19, TypeScript ~6.0, Vite 8 |
| UI components | MUI v9 (+ MUI Icons), custom ThemeContext light/dark |
| Data fetching | TanStack React Query + React Table |
| Forms | react-hook-form + zod |
| State | Zustand (auth only, persisted to localStorage) |
| Routing | react-router-dom v7 |
| Charts | Recharts |
| Linting | oxlint |
| Cache | Redis via `IDistributedCache` (empty `Redis` conn string = in-memory) |

## Repository Layout

```
provider/
├── backend/
│   └── src/
│       ├── AIGateway.Domain/         Entities, Enums, Interfaces
│       ├── AIGateway.Application/    CQRS handlers, DTOs, service interfaces, DI
│       ├── AIGateway.Infrastructure/ AiProviderService, AuthService, ModelRateLimiter, RedisCacheService, DI
│       ├── AIGateway.Persistence/    AppDbContext, DbSeeder, UnitOfWork, Repository, DI
│       └── AIGateway.API/            Program.cs, Controllers, Middleware, appsettings
├── frontend/
│   └── src/
│       ├── pages/                    One page per module (15+ routes)
│       ├── api/                      Axios client + typed endpoints + endpoint docs
│       ├── store/                    Zustand authStore
│       ├── routes/                   AppRoutes (public /login + private MainLayout)
│       ├── theme/                    MUI light/dark palettes
│       ├── context/                  ThemeContext
│       ├── layouts/                  MainLayout shell
│       └── types/                    Shared TS interfaces
├── docker/                           SQL Server, Redis, Nginx compose
├── docs/                             Playground docs
└── opencode.json                     Gateway provider config for opencode
```

## API Conventions

- Controllers live under `/api/{controller}`; the OpenAI-compatible gateway is `/gateway`.
- Every controller except `AuthController` and the `/gateway` endpoint requires `[Authorize]`.
- Admin-only controllers (`Analytics`, `Admin`, `Settings`, `Logs`) require `[Authorize(Roles = "SuperAdmin,Admin")]`.
- Role hierarchy: `SuperAdmin` > `Admin` > `User`.
- Gateway accepts JWT OR API key; anonymous `/gateway` requests get 401.
- Usage records are written for every gateway/chat request (success and failure).

## Frontend Conventions

- All API calls go through `src/api/endpoints.ts` (typed functions) on the shared Axios `api` client — never raw `fetch`.
- Axios interceptors attach the JWT and auto-refresh on 401, redirecting to `/login` on refresh failure.
- Server state via TanStack Query; auth state via Zustand.
- Dates arrive as UTC with `Z`; frontend `parseUtc()` appends `Z` defensively.
- Light/dark theme toggle persisted in localStorage via `ThemeContext`.

## Security

- Passwords hashed with SHA256 (uppercase hex) in `AuthService`.
- JWT key/issuer/audience configured in `appsettings.json`.
- API keys stored hashed/readable; only shown once at creation.
- CORS locked to `http://localhost:5173` and `http://localhost:3000`.
- Remote DB uses `TrustServerCertificate=True` (connection string in appsettings).
- Rate limits enforced server-side per model (in-memory `ModelRateLimiter`).
