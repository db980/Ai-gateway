# AI Gateway — Project Phases & Status

## Phase 1 — Foundation (Done)

- .NET 8 Clean Architecture solution: Domain / Application / Infrastructure / Persistence / API.
- EF Core 8 + SQL Server; `EnsureCreated()` + DbSeeder (24 providers, ~100 models, users, API key, usage, templates, invoices, settings).
- React 19 + Vite + MUI app shell: MainLayout, role-filtered nav, light/dark theme, routes.

## Phase 2 — Auth & API Keys (Done)

- JWT Bearer + refresh tokens (`AuthService`, AuthController).
- Long-lived `sk_` API keys with `ApiKeyMiddleware` on `/gateway` + `/api/chat`.
- ApiKeys page (create/list/copy/delete, one-time secret).

## Phase 3 — Provider & Model Management (Done)

- Providers CRUD incl. nested models; ProviderTypes; Models CRUD with status, pricing, per-model TPM/TPD/RPM/concurrency limits.
- `{id}/test` connectivity test.

## Phase 4 — Gateway (Done)

- OpenAI-compatible `POST /gateway/chat/completions`: streaming (SSE + `[DONE]`) and non-streaming.
- Usage logging per request; error bodies; reasoning_content support.
- Tool calls (delta + non-stream) and `tool_choice`.
- Groq TPM trimming + `IsTpmLimitError` handling (413 + 429).
- `Math.Clamp` fix (min bound `Math.Min(1, maxOut)`); no-output with `max_tokens:1` fixed via 256-token output floor + tool reduction.

## Phase 5 — Rate Limiting (Done)

- `ModelRateLimiter` (singleton, in-memory): RPM 60s sliding window, TPD daily counter, concurrency SemaphoreSlim.
- Per-model TPM as outbound trim budget in `AiProviderService`.
- Verified: rpm=2 → req3 rejected `max 2 requests/min`, req4 rejected by concurrency.
- Fixed duplicate error message.
- DB columns added via ALTER TABLE; seeded limits (qwen 8K/200K/30/4, llama-3.3 12K/200K/60/8).

## Phase 6 — Usage, Analytics, Billing, Admin (Done)

- Usage summary/charts/paged records (UTC).
- Admin analytics overview; users list + role update; settings; audit logs; billing invoices.

## Phase 7 — Frontend Pages (Done)

- Dashboard, Providers, Models, Api Keys, Usage, Analytics, Billing, Prompt Templates, Playground, Users, Settings, Logs, Request Details, Endpoint Docs, Login.
- Playground: streaming, thinking/tool-call panels, parameter controls.
- Request Details redesign: stat cards, expandable rows, filters, CSV export.
- Models page redesign: avatars, status chips, usage bars, capability badges, Limits chips.
- Dashboard error handling fix (analytics 403 fallback).

## Phase 8 — Testing & Polish (In Progress)

- Verify opencode Qwen 3.6 streaming output.
- Test Thinking panel with a reasoning model (e.g. deepseek-reasoner).
- Investigate external watcher auto-restarting AIGateway.API (port races).
- Persist TPD across restarts (currently in-memory).
