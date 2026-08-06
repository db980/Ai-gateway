# AI Gateway Platform

A production-ready AI Gateway platform (OpenRouter/OpenWebUI-style) built with **ASP.NET Core 8** (Clean Architecture) and **React 19** + **TypeScript** + **Vite**. Provides a unified API endpoint for 24+ free LLM providers with 40+ models, JWT authentication, API key management, usage tracking, analytics, streaming, and a full admin dashboard.

## Architecture

```
provider/
├── backend/                         # ASP.NET Core 8 Solution
│   ├── AIGateway.Domain/            # Entities, Enums, Interfaces
│   ├── AIGateway.Application/       # CQRS (MediatR), DTOs, Interfaces
│   ├── AIGateway.Infrastructure/    # JWT Auth, AI Provider Client, Redis Cache
│   ├── AIGateway.Persistence/       # EF Core DbContext, Repositories, Seeder
│   └── AIGateway.API/               # Controllers, Middleware, Program.cs
├── frontend/                        # React 19 + Vite + TypeScript
│   └── src/
│       ├── api/                     # Axios client, endpoint modules
│       ├── context/                 # ThemeContext (light/dark)
│       ├── layouts/                 # MainLayout (responsive drawer)
│       ├── pages/                   # 14 pages
│       ├── routes/                  # AppRoutes (React Router)
│       ├── store/                   # Zustand auth store
│       └── theme/                   # MUI theme config
├── docker/                          # Nginx config for production
├── Dockerfile.api                   # .NET backend Dockerfile
├── Dockerfile.react                 # React frontend Dockerfile
└── docker-compose.yml               # Full stack orchestration
```

## Quick Start

### Prerequisites
- [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
- [Node.js 20+](https://nodejs.org/)
- SQL Server (local or Docker)
- Redis (local or Docker)

### Backend

```powershell
cd backend/src/AIGateway.API
dotnet restore
dotnet run
```

The API starts at `http://localhost:5000` with Swagger at `http://localhost:5000/swagger`.

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

The dev server starts at `http://localhost:5173` and proxies `/api` requests to the backend.

### Docker (Full Stack)

```powershell
docker compose up
```

This starts SQL Server, Redis, the .NET API, and the React frontend (Nginx).

## Default Credentials

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@aigw.com | Admin@123 | Admin123!

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/login` | - | Login |
| POST | `/api/auth/register` | - | Register |
| POST | `/api/auth/refresh` | - | Refresh token |
| GET | `/api/auth/profile` | JWT | Get profile |
| POST | `/api/chat` | JWT/API Key | Chat completion (supports streaming) |
| GET | `/api/providers` | JWT | List providers |
| POST | `/api/providers` | JWT | Create provider |
| GET | `/api/models` | JWT | List models |
| POST | `/api/models` | JWT | Create model |
| GET | `/api/apikeys` | JWT | List API keys |
| POST | `/api/apikeys` | JWT | Generate API key |
| GET | `/api/usage/summary` | JWT | Usage summary |
| GET | `/api/usage/charts` | JWT | Usage chart data |
| GET | `/api/analytics/overview` | Admin | Analytics overview |
| GET | `/api/billing/invoices` | JWT | List invoices |
| GET | `/api/prompttemplates` | JWT | List prompt templates |
| POST | `/api/prompttemplates` | JWT | Create prompt template |
| GET | `/api/admin/users` | Admin | List users |
| PUT | `/api/admin/users/{id}/role` | Admin | Update user role |
| GET | `/api/settings` | Admin | List settings |
| PUT | `/api/settings/{key}` | Admin | Update setting |
| GET | `/api/logs` | Admin | Audit logs |

## Frontend Pages

| Route | Page | Access |
|-------|------|--------|
| `/login` | Login/Register | Public |
| `/dashboard` | Dashboard with stats & charts | All |
| `/providers` | Provider management | Admin |
| `/models` | AI model management | All |
| `/api-keys` | API key management | All |
| `/usage` | Usage statistics | All |
| `/analytics` | Platform analytics | Admin |
| `/billing` | Invoices & plan | All |
| `/prompts` | Prompt templates | All |
| `/playground` | Chat playground with streaming | All |
| `/users` | User management | Admin |
| `/settings` | System settings | Admin |
| `/logs` | Audit log viewer | Admin |

## Included Free LLM Providers

The platform seeds 24+ providers with 40+ models out of the box, including: OpenAI-compatible APIs, Claude, Gemini, DeepSeek, Groq, Mistral, OpenRouter, Ollama, LMStudio, Cohere, Cerebras, Cloudflare, GitHub Models, HuggingFace, NVIDIA, and more.

## Tech Stack

- **Backend**: .NET 8, MediatR (CQRS), FluentValidation, EF Core, JWT Bearer, Serilog, StackExchange.Redis
- **Frontend**: React 19, TypeScript, Vite, MUI v9, Recharts, Zustand, Axios, React Router v7, React Hook Form

## License

MIT
