# Handover

## Run

```powershell
# Backend (built EXE avoids stale DLLs)
backend/src/AIGateway.API/bin/Debug/net8.0/AIGateway.API.exe --urls http://localhost:5005

# Frontend
cd frontend && npm run dev   # http://localhost:5173
```

Open **http://localhost:5173** — Vite proxies `/api` and `/gateway` to `http://localhost:5005`.

## Build

- Backend: `dotnet build backend/AIGateway.sln`
- Frontend lint: `npm run lint` (oxlint); build: `npm run build` (`tsc -b && vite build`)

## Credentials

- SuperAdmin: `admin@aigw.com` / `Admin@123`
- DemoUser: `demo@aigw.com` / `Admin@123`
- Remote DB: `202.160.134.3` / AIGateway / Admin / `Admin@123` (`TrustServerCertificate=True`)
- opencode gateway provider: `nexgateway` at `http://localhost:5005/gateway` (key in `opencode.json`)

## Session Status

| Area | Status |
|------|--------|
| Gateway (stream + non-stream, reasoning, tools) | Done |
| Per-model rate limits (TPM/TPD/RPM/concurrency) | Done |
| Providers / Models / Types CRUD | Done |
| Auth (JWT + API keys) | Done |
| Usage / Analytics / Billing / Admin / Settings / Logs | Done |
| Frontend pages (15+) | Done |
| Thinking panel testing | Pending |
| Qwen 3.6 streaming verification | Pending |

## Deployment notes

1. DB is remote SQL Server — keep connection string (or run fully local with SQLite provider).
2. Schema changes are manual ALTER TABLE (no EF migrations; EnsureCreated only creates new DBs).
3. Per-model limits default when unset: TPM=8000, no TPD/RPM/concurrency.
