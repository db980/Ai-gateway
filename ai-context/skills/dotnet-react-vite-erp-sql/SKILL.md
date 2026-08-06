---
description: AI Gateway development skill
alwaysApply: true
---

---

# AI Gateway Skill

## Stack

- Backend: .NET 8, EF Core 8, SQL Server (remote `202.160.134.3`), JWT + API keys, Serilog — `backend/`
- Architecture: Clean Architecture (Domain / Application / Infrastructure / Persistence / API), CQRS with MediatR, AutoMapper
- Frontend: React 19, Vite 8, TypeScript, MUI v9 — `frontend/`
- State: Zustand (auth) + TanStack Query (server state)
- Forms: react-hook-form + zod
- Charts: Recharts; Tables: TanStack React Table
- API Client: `frontend/src/api/client.ts` + `frontend/src/api/endpoints.ts`

## Process

AI Gateway routes OpenAI-compatible chat requests across multiple AI providers:

`Client → /gateway/chat/completions (JWT or sk_ key) → ModelRateLimiter → AiProviderService → upstream provider`

- Per-model rate limits: RPM (60s sliding window), TPD (daily counter), concurrency (SemaphoreSlim), TPM (outbound budget trim).
- Groq free-tier TPM trimming: auto-trim request to fit model TPM; handle both 413 and 429 TPM errors.
- Thinking Mode opt-in via `settings.enableThinking` (maps to provider `enable_thinking`).
- Groq qwen emits thinking inline as `<think>...</think>` — gateway strips into `reasoning_content`.

## Conventions

- No EF migrations: `EnsureCreated()` + manual ALTER TABLE for schema changes.
- All reads via `_uow.Repository<T>().Query()` + LINQ; raw SQL only `ExecuteSqlRawAsync` with parameterized args.
- UTC everywhere; emit `Z` in JSON.
- No comments in code unless necessary; no emojis.
- Backend run: `backend/src/AIGateway.API/bin/Debug/net8.0/AIGateway.API.exe --urls http://localhost:5005`.
