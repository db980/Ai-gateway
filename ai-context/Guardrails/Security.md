# Security

- Passwords hashed with SHA256 (uppercase hex) in `AuthService`; never stored in plaintext.
- JWT Bearer (60 min expiry) + refresh tokens (revocable) for session auth.
- Long-lived API keys (`sk_` prefix) authenticated by `ApiKeyMiddleware` on `POST /api/chat` + `/gateway/chat/completions`; key secret returned only once at creation.
- JWT key/issuer/audience in `appsettings.json` — rotate to env var in production.
- CORS locked to frontend origins (`http://localhost:5173`, `http://localhost:3000`).
- Remote SQL connection uses `TrustServerCertificate=True`; credentials `Admin`/`Admin@123` (project-scoped, intentional).
- Role-based authorization: SuperAdmin > Admin > User; admin endpoints restricted via `[Authorize(Roles = "SuperAdmin,Admin")]`.
- Per-model rate limiting enforced server-side (in-memory `ModelRateLimiter`): RPM sliding window, TPD daily counter, concurrency semaphore.
- `ExceptionMiddleware` returns generic JSON 500s; stack traces only in Development.
- No secrets hardcoded in source; API keys stored in DB, masked in lists.
