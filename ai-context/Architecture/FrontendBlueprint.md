# Frontend Blueprint — AI Gateway Dashboard

Complete structural guide for the React 19 + MUI v9 frontend: app shell, navigation, pages, shared components, and data patterns.

---

## 1. Stack & Setup

- React 19 + TypeScript ~6.0, Vite 8, MUI v9, Recharts, Zustand, TanStack React Query + React Table, Axios, react-hook-form + zod, react-router-dom v7, react-syntax-highlighter
- Lint: `oxlint` (`npm run lint`); build: `tsc -b && vite build`
- Dev server: port 5173; Vite proxy forwards `/api` and `/gateway` to `http://localhost:5005`

## 2. App Shell

```
┌──────────────────────────────────────────────┐
│ AppBar: menu · title · theme toggle · user   │
├──────────┬───────────────────────────────────┤
│ Drawer   │ <Outlet /> routed page            │
│ nav      │  - Page header (title + actions)  │
│ role-    │  - Stat cards                     │
│ filtered │  - Charts / tables                │
└──────────┴───────────────────────────────────┘
```

- `MainLayout.tsx`: AppBar, role-filtered nav drawer, theme toggle, user menu with logout, `<Outlet />`
- `AppRoutes.tsx`: public `/login`; private `MainLayout` wrapper for all 15 child routes
- `PrivateRoute` redirects unauthenticated users to `/login`

## 3. State & Data

- **Zustand** `store/authStore.ts`: `user`, `token`, `refreshToken` persisted to localStorage; `setAuth`, `logout`
- **Axios** `api/client.ts`: baseURL `/api`, attaches JWT, auto-refreshes on 401, redirects to `/login` on refresh failure
- **Typed endpoints** `api/endpoints.ts`: auth, providers, models, apiKeys, usage, analytics, billing, promptTemplates, admin, settings, logs, chat; includes SSE streaming helpers and custom-provider chat
- **Types** `types/index.ts`: User, Provider, AIModel, ApiKey, Usage, Chat, Invoice, etc.

## 4. Page Patterns

| Page | Pattern |
|---|---|
| Dashboard | `Promise.all` over usage/models/providers + try/catch analytics fallback (403-safe for users) |
| Providers | CRUD table, expandable model rows, create/edit dialogs, type management, active toggle |
| Models | Analytics view + filterable/sortable table; per-model TPM/TPD/RPM/concurrency config |
| Usage / RequestDetails | Stat cards, charts, paginated tables, filters (`days`), CSV export, UTC parsing |
| Analytics | Admin: 11 stat cards, charts, activity feed, error table |
| Playground | SSE streaming chat, Thinking panel (`reasoning_content`), tool-call panel, parameter controls |
| EndpointDocs / Docs | Static endpoint catalog from `api/endpointDocs.ts`; code examples + SDK config snippets |

## 5. Shared Conventions

- All API calls via `api/endpoints.ts` — never raw `fetch`
- Tables: `overflowX: auto` + `minWidth` (no `overflow: hidden`)
- Stat cards: gradient tiles with hover
- UTC timestamps: append `Z` defensively (`parseUtc()`)
- Light/dark theme via `ThemeContext` (localStorage-persisted)

## 6. Theming

- `theme/theme.ts`: `lightTheme` / `darkTheme` MUI palettes
- `App.tsx`: wraps app in custom ThemeProvider and renders `AppRoutes`
