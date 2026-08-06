# UI / UX Design Reference

For the full page inventory and layout patterns, see [FrontendBlueprint.md](./FrontendBlueprint.md).

## Design System

- **Component library:** MUI v9 (Material-UI) with `@mui/icons-material`
- **Theming:** custom `theme/theme.ts` — `lightTheme` / `darkTheme` palettes; toggled by `ThemeContext` (persisted in localStorage)
- **Global styles:** `src/index.css` — reset, Roboto font, custom scrollbars
- **Dashboard cards:** gradient backgrounds + hover elevation

## Layout Conventions

- **App shell:** `MainLayout` — AppBar (top), role-filtered navigation drawer (left), theme toggle, user avatar menu, `<Outlet />` for routed pages
- **Navigation:** drawer items filtered by role; admin-only pages (Analytics, Users, Settings, Logs) hidden for regular users
- **Page structure:** page header (title + actions) → stat cards → charts/tables

## Page Inventory

| Route | Page | Purpose |
|---|---|---|
| `/login` | LoginPage | Login/register tabs |
| `/dashboard` | DashboardPage | Metric tiles, charts, recent activity, provider/model health |
| `/providers` | ProvidersPage | Provider CRUD with expandable model rows + type management |
| `/models` | ModelsPage | Analytics view + filterable/sortable table + rate-limit config |
| `/api-keys` | ApiKeysPage | Generate/list/copy/delete API keys, one-time secret |
| `/usage` | UsagePage | Stat cards, 30-day chart, paginated request log |
| `/analytics` | AnalyticsPage | Admin: stat cards, charts, activity feed, error table |
| `/billing` | BillingPage | Current plan + invoices table |
| `/prompts` | PromptTemplatesPage | Template list/search/filter/copy/create |
| `/playground` | PlaygroundPage | Interactive chat: streaming, thinking/tool-call panels, parameters |
| `/users` | UsersPage | Admin user listing with role/status filters |
| `/settings` | SettingsPage | Editable system settings key/value pairs |
| `/logs` | LogsPage | Paginated audit log table |
| `/request-details` | RequestDetailsPage | Per-request tracking: stat cards, expandable rows, filters, CSV export |
| `/endpoint-docs` | EndpointDocsPage | Interactive API reference + code examples |
| `/docs` | DocsPage | Card-grid endpoint overview by category |

## Shared Patterns

- **Tables:** `overflowX: auto` + `minWidth` (Models 1100px, RequestDetails 1000px) — avoid `overflow: hidden` clipping
- **Stat cards:** gradient tiles with hover
- **Status display:** clickable status chips on Models; latency chips on Request Details
- **Time display:** relative + full UTC (`Z`) timestamps
- **Empty states:** friendly message + icon for empty tables/lists

## Responsive

- MUI default breakpoints; drawer collapses on mobile, tables scroll horizontally.
