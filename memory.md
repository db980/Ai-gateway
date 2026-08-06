# Project Memory

Auto-updated at the end of every chat session. Keeps a persistent record of what has been done so future sessions can resume instantly.

## Auto-Save Rules

- **This file is the persistent memory source of truth** for the project.
- **On chat close / session end**: When the user closes the chat, ends the session, or says "close chat" / "goodbye" / "save memory", **automatically update this file before finishing**.
- **On session start**: Always read this file first to load the `Last Session` and `Pending Tasks` sections, so work resumes where it stopped.
- **What to record**: Update the `Last Session` section (date, topic, completed, in-progress, next steps) and append a row to the `Session Log` table. Add unresolved issues to `Known Issues` and unfinished work to `Pending Tasks`.
- **Keep it concise**: Only store durable facts, decisions, bugs, and next steps. Do not log trivial chatter.
- **Never delete history**: Append/overwrite the `Last Session` block; preserve the `Session Log` history.

## Last Session

- **Date**: 2026-08-01 (Session 10)
- **Topic**: UI + backend smoke tests; fixed `/api-keys` route being swallowed by Vite proxy
- **Completed**:
  - Wrote `test-smoke.ps1` (repo root): logs in as admin+demo and hits 18 endpoints. All OK except `POST /api/chat` w/ `gpt-4o` → 410 (upstream GitHub Models key returns 410 Gone — surfaced correctly by gateway, NOT a code bug). Verified chat pipeline healthy via Groq models (`llama-3.3-70b-versatile`, `qwen/qwen3.6-27b`, `gpt-oss-*` respond; some models 403/400 = upstream model-availability/key-tier issues).
  - UI scan via headless Chrome CDP across all 17 routes with real admin token: found `/api-keys` rendered Chrome's "page can't be found". **Root cause: Vite proxy context `/api` matched the `/api-keys` SPA route and forwarded it to the backend (404).**
  - Fix: `vite.config.ts` proxy context `/api` → `/api/` (trailing slash). `/api-keys` now serves the SPA; `/api/*` API calls still proxy to backend. Verified both via HTTP + full CDP re-scan (all routes render; `/login` blank when authed is the expected redirect-to-dashboard).
  - `/providers` briefly appeared blank in scan 2 = timing flake (3× focused test rendered 182418 consistently).
  - Lint + build green.
- **In Progress**: None.
- **Next Steps**: If any provider returns 410/403/400 on chat, it's an upstream key/model issue, not the gateway.

## Previous Session

- **Date**: 2026-07-31 (Session 8)
- **Topic**: Billing section redesign + pluggable payment gateway (Mock default, Stripe adapter)
- **Completed**:
  - Backend `IPaymentGateway` (`Application/Interfaces/IPaymentGateway.cs`) with `PaymentRequest`/`PaymentResult`; `MockPaymentGateway` (sandbox: `tok_decline` → declined, else success w/ `mock_` tx id, 400ms delay) and `StripePaymentGateway` (raw HTTP to Stripe PaymentIntents API, confirm=true, amounts in cents, active only when configured) selected in `AddInfrastructure` DI by `PaymentGateway:Provider`/`SecretKey`.
  - `PlanCatalog` static (Free/Starter/Professional/Enterprise with price, cycle, tokensIncluded, features, maxRequestsPerDay, isPaid) + enriched `BillingDtos` (PlanDto/BillingSummaryDto/InvoiceDto w/ plan+gatewayRef/CheckoutRequestDto/CheckoutResultDto/CancelResultDto).
  - New endpoints: `GET /api/billing/plans`, `GET /api/billing/summary`, `POST /api/billing/checkout` (gateway charge → upgrade Plan + grant tokensIncluded credits + create Paid Invoice w/ `INV-yyyyMMdd-XXXXXXXX`, tx id stored in `StripeInvoiceId`), `POST /api/billing/cancel` (→ Free). Invoice plan derived from amount via `PlanCatalog.FindByPrice` (no schema change).
  - Verified live (demo user): plans list, summary (Free/100 credits/Mock/spent 0), decline returns error, pay upgrades to Professional +10M credits + invoice w/ gw ref, cancel → back to Free.
  - Frontend: types (`Plan`, `BillingSummary`, enriched `Invoice`, `CheckoutRequest/Result`, `CancelResult`) + `billing.plans/summary/checkout/cancel` endpoints + `authStore.setUser`. BillingPage redesign: summary banner (plan/credits/gateway/spent/next billing + upgrade/cancel buttons), 4 plan cards (current highlighted, upgrade/downgrade actions), checkout dialog (card form, sandbox hint: cards starting 4000 decline), invoices table (plan chip, gateway ref, status). `auth.profile()` + `setUser` refreshes plan after checkout/cancel.
  - Lint + build green (only pre-existing warnings); backend + dev server verified.
- **In Progress**: None.
- **Next Steps**: Browser-verify checkout flow + plan upgrade; optionally add `from`/`to` to `endpointDocs.ts` for new billing endpoints; consider route-level code-splitting.

## Previous Session

- **Date**: 2026-07-31 (Session 3)
- **Topic**: Rebuild + remove unused files + verify running state
- **Completed**:
  - Rebuilt the solution; confirmed backend (port 5005) and frontend dev server (port 5173) are both running.
  - Removed unused files from the repo.
- **In Progress**: None.
- **Next Steps**: Verify opencode Qwen 3.6 output streams; test Thinking panel with deepseek-reasoner; investigate external watcher auto-restarting AIGateway.API.

## Session Log

| Date | Topic | Key Changes | Status |
|------|-------|-------------|--------|
| 2026-07-31 | Memory auto-save rules | Created `memory.md`; added Memory Auto-Save Rules to `AGENTS.md` (save on chat close, read on session start) | Done |
| 2026-07-31 | Fix Qwen 3.6 no output via gateway | TPM 429 trim handling in `AiProviderService.cs` (`IsTpmLimitError`, immediate throw on TPM, trim on 429) | Done |
| 2026-07-31 | Live reasoning/thinking streaming | Backend DTO + stream/non-stream parsing + SSE `reasoning_content`/`role`; frontend `StreamEvent` parser + Thinking panel + Thinking Mode toggle | Done |
| 2026-07-31 | Strip `<think>` tags into reasoning | Streaming think state machine + `SplitThinkTags()`; verified via curl (REASONING len=735, clean content) | Done |
| 2026-07-31 | Request Details date filter | `days` param in query/controller; default Last 3 days selector; relative + full time column | Done |
| 2026-07-31 | Fix `max_tokens:1` no-output bug | `PrepareForTpm` rewrote to reduce tools + min 256 output floor; retry loops use `IsTpmLimitError`; verified outbound `max_tokens:1229` | Done |
| 2026-07-31 | Request Details redesign | Stat cards, token bar, latency chips, detail grid, CSV export, UTC time fix (`SpecifyKind` + `parseUtc`) | Done |
| 2026-07-31 | AI Models UI redesign | List: avatars, status chips, usage bars, capability badges, Limits column, empty states; dashboard stat cards gradient+hover | Done |
| 2026-07-31 | Per-model rate limits | `TpmLimit/TpdLimit/RpmLimit/MaxConcurrency` on AIModel + `ModelRateLimiter` (RPM/TPD/concurrency) + per-model TPM trim budget; verified enforcement; fixed Clamp crash + dup error msg; DB columns added | Done |
| 2026-07-31 | Rebuild + state check | Rebuilt solution; backend 5005 + frontend 5173 confirmed running | Done |
| 2026-07-31 | Remove unused files | Cleaned up unused files from repo | Done |
| 2026-07-31 | UI redesign + premium features | Theme/layout/Providers/Playground redesign; Command Palette; Dashboard leaderboard+live status+budget alerts; Usage forecasting+cost optimizer; Token Cost Calculator; CSV/JSON exports | Done |
| 2026-07-31 | Model pricing feature | Backend $/1K price fields + per-token DB persistence + `PUT /models/pricing/bulk`; Model Pricing page `/models/pricing` (set-all, token-vs-price comparison, per-model edit); Models dialogs price fields; verified endpoints live | Done |
| 2026-07-31 | Model Pricing filters | Provider, model search, provider status (active/inactive), pricing status, usage filters on `/models/pricing` | Done |
| 2026-07-31 | Dashboard trend charts | Enriched `UsageChartDto`/`GetUsageChartsQuery` (prompt/completion tokens, errors, avg latency per day); Dashboard: live 1s ticker, Token Mix trend, Success vs Errors, Avg Latency, Requests by Provider pie, Token Mix donut, Success Rate gauge | Done |
| 2026-07-31 | Dashboard model trend/comparison | "Most Used Models — Trend Over Time" multi-line chart (top 6 models by day from usage records); "Model Comparison" horizontal bars with Requests/Tokens/Latency/Cost metric selector; records fetch bumped 100→1000 | Done |
| 2026-07-31 | Dashboard filter bar + defaults | Filter bar (days/provider/model/status/custom range, active-only switches, reset); default = Today + active providers/models only; backend `from`/`to` on charts; Requests by Provider % labels + center total overlay; dynamic chart titles; removed dead `errors` state | Done |
| 2026-07-31 | Billing + payment gateway | `IPaymentGateway` (Mock default / Stripe adapter via config), `PlanCatalog`, plans/summary/checkout/cancel endpoints, checkout grants plan + credits + Paid invoice; BillingPage redesign w/ plan cards, checkout dialog, summary banner, invoices table | Done |
| 2026-08-01 | Fix blank frontend | Corrupted `localStorage.user` crashed app at module load (JSON.parse in authStore) → blank on all routes; made authStore read user defensively (try/catch + remove bad key); `isAuthenticated` requires token+valid user; removed duplicate stale dev server on 5174 | Done |
| 2026-08-01 | UI/backend smoke tests | `test-smoke.ps1` (18 endpoints OK; `/api/chat` 410 = upstream GitHub Models key); chat pipeline verified via Groq models; Vite proxy `/api` context swallowed `/api-keys` route → changed to `/api/`; full CDP route scan green | Done |

## Pending Tasks

- Verify Model Pricing page (`/models/pricing`) UI in browser (data loads, bulk apply, per-model edit)
- Verify opencode Qwen 3.6 output streams (Groq daily TPD quota was near-exhausted during testing; qwen TPD 200K may need reset)
- Test Thinking panel with a reasoning model (e.g. deepseek-reasoner) in Playground
- Consider route-level code-splitting (React.lazy) - main chunk ~1.3MB / 375KB gzip triggers Vite warning

## Decisions & Conventions

- Groq free-tier qwen/openai-gpt-oss models have TPM limit 8000 - gateway must auto-trim requests (handle both 413 and 429 TPM errors)
- SSE chunks carry reasoning under `delta.reasoning_content` (OpenAI-compatible convention)
- Thinking Mode is opt-in via `settings.enableThinking` (sends `enable_thinking` to provider)
- Groq qwen emits thinking as inline `<think>...</think>` in content - gateway strips into `reasoning_content`
- Run backend via built EXE with `--urls http://localhost:5005` (avoids stale `dotnet run --no-build` DLLs)
- Launch backend EXE with `WorkingDirectory` = `backend\src\AIGateway.API\bin\Debug\net8.0` so `appsettings.json` resolves; from repo root the app loads empty config and dies silently at seeding (exit 0, no log output)
- Model pricing: stored per-token in DB (`PricePerPromptToken`/`PricePerCompletionToken`); API/UI expose $/1K tokens (divide by 1000 to persist, multiply by 1000 to read)
- Per-model limits default when unset: TPM=8000, no TPD/RPM/concurrency limits unless configured via ModelRateLimiter
- Files containing JSX must use `.tsx` extension (`.ts` fails to parse - `navigation.tsx`)
- MUI v7 API: use `slotProps` (e.g. `slotProps={{ paper }}`, `slotProps={{ primary }}`) - `PaperProps`/`primaryTypographyProps` are gone; Grid uses `size={{ xs }}`

## Known Issues

- Backend port 5000 vs 5005 port conflict history - keep 5005 (see AGENTS.md)
- AutoMapper 13.0.1 has a known high-severity vulnerability (build warning NU1903)
- Groq free tier TPM 8000 rate-limits quickly during burst testing (429) - wait ~1min between tests
- ModelRateLimiter is in-memory (per-process); limits reset on API restart and don't persist TPD across restarts
- MUI v7 TextField no longer accepts `inputProps` (use `slotProps.htmlInput`); Grid container `alignItems` must be in `sx`
