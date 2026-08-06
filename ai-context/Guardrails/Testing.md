# Testing

## Backend

- No automated test project is configured (backend linter/tests not set up).
- Manual test scripts in repo root: `test-login.ps1`, `test-usage.ps1`, `test-create-provider.ps1`, `test-backend.ps1`, `test-debug.ps1`, `test-new.ps1`, `test-usage2.ps1`.
- Verify gateway via curl: streaming SSE (`data:` chunks + `[DONE]`) and non-stream chat completions, using either a JWT or `sk_` API key.
- Per-model rate limits verified by hitting the model over its RPM/concurrency limit and asserting the 429 `max N requests/min` / concurrency error.
- Groq free-tier TPM 8000 rate-limits quickly during burst tests — wait ~1 min between tests.

## Frontend

- Lint: `npm run lint` (oxlint) in `frontend/`.
- Build/typecheck: `npm run build` (`tsc -b && vite build`).
- Manual checks: login, dashboard (regular user must not break on 403 analytics), Models/Request Details tables (horizontal scroll), Playground streaming + Thinking panel, light/dark theme toggle.

## Known Risks

- `ModelRateLimiter` is in-memory — limits reset on API restart; TPD does not persist across restarts.
- External watcher auto-restarts AIGateway.API (parent PID 13292), causing port races.
