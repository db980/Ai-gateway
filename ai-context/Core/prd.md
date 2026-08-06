---
description: AI Gateway - product requirements
alwaysApply: true
---

---

# AI Gateway — Product Requirements

A full-stack application to manage and route AI API requests across multiple AI providers, with an OpenAI-compatible gateway and a management dashboard.

## Core Goals

- Expose one OpenAI-compatible endpoint (`POST /gateway/chat/completions`) usable by any LLM tool (e.g. opencode) as a drop-in provider.
- Accept both JWT Bearer tokens and long-lived API keys (`sk_` prefix).
- Manage AI providers and models (CRUD), with per-model pricing, status, and rate limits.
- Enforce per-model rate limits: TPM, TPD, RPM, concurrency.
- Record usage per request (tokens, cost, latency, success, payloads) for dashboards and billing.
- Support reasoning/thinking models: stream `reasoning_content`, strip Groq `<think>` tags.
- Provide an admin dashboard: analytics, users, settings, audit logs, billing invoices, prompt templates, playground.

## Key Users

- **User** — uses the playground, API keys, usage views, prompt templates.
- **Admin / SuperAdmin** — manages providers, models, settings, users, logs, analytics, billing.

## Non-Goals

- No public signup/monetization flow beyond plan/credits scaffolding.
- No multi-tenant separation (single deployment).
- No EF migrations — schema changes via manual ALTER TABLE (remote SQL Server).

## Acceptance Criteria

- Gateway streams and non-streams correctly with reasoning content; usage logged.
- Rate limits enforced with clear 429 messages.
- Regular users never break on admin-only endpoints (Dashboard analytics fallback).
