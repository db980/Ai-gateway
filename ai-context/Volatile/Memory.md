# Session Memory

**2026-07-31 (Session 3):** Rebuilt solution; backend (5005) + frontend (5173) confirmed running. Removed unused files. AI context (AGENTS.md + ai-context/) updated: project overview, per-file reference, SQL/data-access patterns, architecture/API/schema/design/guardrails/skills docs rewritten for AI Gateway.

**2026-07-31 (Session 2):** Per-model rate limits (TPM/TPD/RPM/concurrency) implemented and verified; fixed Math.Clamp crash and duplicate error message; added limit columns via ALTER TABLE; seeded limits. UI polish on Models + Request Details pages; UTC time fix (`SpecifyKind` + `parseUtc`).

**2026-07-31 (Session 1):** Memory auto-save rules added; gateway reasoning/thinking streaming; `<think>` tag stripping; Request Details date filter + redesign; `max_tokens:1` no-output fix.

**Earliest:** Fixed port conflict (5000→5005), Docker compose password mismatch, dashboard analytics 403 fallback.

## Key Decisions

- Gateway is OpenAI-compatible, JWT OR API key auth.
- No EF migrations — EnsureCreated + manual ALTER TABLE.
- ModelRateLimiter in-memory (resets on restart).
- Remote DB `202.160.134.3` intentional.
- Run backend via built EXE `--urls http://localhost:5005`.
