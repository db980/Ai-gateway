# AI Gateway Core Processes

## Chat Request Flow

1. Client calls `POST /gateway/chat/completions` with `model`, `messages`, optional `stream`, `settings`, `tools`, `toolChoice`.
2. `ApiKeyMiddleware` authenticates `sk_` keys; JWT via standard bearer auth. Anonymous → 401.
3. `GatewayController` resolves the model by `Name` or `ActualModelName`, preferring active providers ordered by priority.
4. If `stream`: SSE response — each chunk carries `delta.content`, `delta.reasoning_content`, `delta.tool_calls`, `finish_reason`; ends with `data: [DONE]`. If non-stream: single completion JSON with `message.reasoning_content` and `usage`.
5. `AiProviderService` enforces per-model rate limits and trims outbound payload to fit TPM budget; handles 429/TPM retries.
6. A `UsageRecord` is persisted for every request (success or failure) with tokens, cost, latency, payloads, IP.

## Thinking / Reasoning

- Thinking Mode is opt-in via `settings.enableThinking` (maps to provider `enable_thinking`).
- Reasoning appears under `reasoning_content` in SSE `delta` and non-stream `message`.
- Groq qwen emits thinking inline as `<think>...</think>` — gateway strips into `reasoning_content`.

## Rate Limits

- Per-model: TPM (outbound trim), TPD (daily counter), RPM (60s sliding window), concurrency (`SemaphoreSlim`).
- `ModelRateLimiter` is a singleton, in-memory — limits reset on API restart; TPD does not persist.
- Unset limits default: TPM=8000, no TPD/RPM/concurrency.

## Playground

- `/playground` uses the OpenAI-compatible proxy `POST /api/chat` (JWT or API key) with SSE streaming, thinking panel, tool-call panel, and parameter controls.

## Docs

- `/endpoint-docs` and `/docs` render the static endpoint catalog from `frontend/src/api/endpointDocs.ts`.
