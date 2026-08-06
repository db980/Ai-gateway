# API Reference

Base URL: `http://localhost:5005` (dev) — API: `/api/{controller}`, Gateway: `/gateway/chat/completions`
Auth: JWT Bearer (`Authorization: Bearer <access_token>`) OR long-lived API key (`sk_...`)
Streaming: Server-Sent Events (`data:` chunks + `[DONE]`)
Errors: JSON `{ message | error: { message, type, code } }`

Default seed users: `admin@aigw.com` / `Admin@123` (SuperAdmin), `demo@aigw.com` / `Admin@123` (User)

## Auth (public)

| Method | Path | Body | Response |
|--------|------|------|----------|
| POST | `/api/auth/login` | `{ email, password }` | `{ user, token, refreshToken }` |
| POST | `/api/auth/refresh` | `{ refreshToken }` | `{ user, token, refreshToken }` |
| POST | `/api/auth/register` | `{ email, username, password }` | auth response |
| GET | `/api/auth/profile` | - | current user profile |

## Gateway (OpenAI-compatible, JWT or API key)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/gateway/chat/completions` | OpenAI-compatible chat. Body: `model`, `messages`, `stream`, `settings` (temperature/topP/frequencyPenalty/presencePenalty/maxTokens/stopSequence/jsonMode/enableThinking), `tools`, `toolChoice`. Stream: SSE with `delta.content`, `delta.reasoning_content`, `delta.tool_calls` |

## Providers / Models / Types

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/providers` | JWT | List providers incl. nested models |
| POST | `/api/providers` | JWT | Create provider (+ optional nested models) |
| PUT | `/api/providers/{id}` | JWT | Update provider + models |
| DELETE | `/api/providers/{id}` | JWT | Delete provider + models |
| GET | `/api/models` | JWT | List models (optional `providerId` filter) |
| POST | `/api/models` | JWT | Create model (incl. TPM/TPD/RPM/concurrency limits) |
| PUT | `/api/models/{id}` | JWT | Update model (incl. limits) |
| DELETE | `/api/models/{id}` | JWT | Delete model |
| POST | `/api/models/{id}/test` | JWT | Connectivity test |
| GET | `/api/providertypes` | JWT | List provider types |
| POST | `/api/providertypes` | JWT | Create provider type |
| DELETE | `/api/providertypes/{id}` | JWT | Delete provider type |

## Usage / Analytics / Billing

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/usage/summary` | JWT | User totals (requests, tokens, cost, errors, active keys) |
| GET | `/api/usage/charts?days=30` | JWT | Daily chart series |
| GET | `/api/usage?page=&pageSize=&days=` | JWT | Paged usage records (UTC) |
| GET | `/api/analytics/overview` | SuperAdmin,Admin | Global analytics (requests, users, tokens, revenue, latency) |
| GET | `/api/billing/invoices` | JWT | Current user's invoices |
| GET | `/api/admin/users` | SuperAdmin,Admin | List users |
| PUT | `/api/admin/users/{id}/role` | SuperAdmin,Admin | Update user role |

## Keys / Settings / Logs / Templates

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/apikeys` | JWT | List current user's API keys (no secret) |
| POST | `/api/apikeys` | JWT | Create `sk_live_` key (secret returned once) |
| DELETE | `/api/apikeys/{id}` | JWT | Delete key (ownership-checked) |
| GET | `/api/settings` | SuperAdmin,Admin | All settings |
| PUT | `/api/settings/{key}` | SuperAdmin,Admin | Update setting |
| GET | `/api/logs?page=&pageSize=` | SuperAdmin,Admin | Paged audit logs |
| GET | `/api/prompttemplates` | JWT | List own + public templates |
| POST | `/api/prompttemplates` | JWT | Create template |
| POST | `/api/chat` | JWT | OpenAI-compatible proxy (Playground path; API key also accepted) |

## Roles / Permissions

- `SuperAdmin` > `Admin` > `User` (role hierarchy enforced via `[Authorize(Roles=...)]`)
- API keys bypass JWT on `/gateway` and `POST /api/chat` via `ApiKeyMiddleware`
