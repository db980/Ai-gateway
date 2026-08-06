# AI Gateway Rules

1. Follow existing project architecture and coding standards (Clean Architecture, CQRS/MediatR).
2. **No comments in code** unless absolutely necessary.
3. **No emojis** in code or commit messages.
4. **No EF migrations** — use `EnsureCreated()` + manual ALTER TABLE for schema changes on the remote DB.
5. Use `IUnitOfWork` + `IRepository<T>.Query()` (LINQ) for all reads; never `FromSqlRaw`/`SqlQuery` composition.
6. Raw SQL only via `context.Database.ExecuteSqlRawAsync(...)` with parameterized args (`@p0`, `@p1`, ...).
7. Pagination: `Skip((page - 1) * pageSize).Take(pageSize)` with `OrderByDescending`.
8. Aggregation: load rows with `ToListAsync()` then aggregate in memory (`GroupBy`/`Sum`/`Count`) — don't rely on server-side grouping.
9. Every timestamp stored/comparsed as UTC (`DateTime.UtcNow`); emit `DateTime.SpecifyKind(..., Utc)` so JSON carries `Z`.
10. All controllers (except Auth and `/gateway`) require `[Authorize]`. Admin endpoints require `[Authorize(Roles = "SuperAdmin,Admin")]`.
11. Gateway accepts JWT OR API key; anonymous `/gateway` requests rejected with 401.
12. Role-based access: SuperAdmin > Admin > User.
13. Backend routes follow `/api/{controller}` pattern (except `/gateway`).
14. Per-model limits default when unset: TPM=8000, no TPD/RPM/concurrency unless configured via `ModelRateLimiter`.
15. Run backend via built EXE with `--urls http://localhost:5005` (avoids stale DLLs).
16. Keep the DB connection string pointing to the remote server `202.160.134.3` unless running fully local.
17. Reuse `src/api/endpoints.ts` and existing shared components; never raw `fetch`.
18. Do not modify existing architecture unnecessarily.
