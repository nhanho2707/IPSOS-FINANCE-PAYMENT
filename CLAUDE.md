# IPSOS Finance Payment — Project Rules

## Project Overview

Internal tool for IPSOS Vietnam to manage field research projects and incentive payments to survey respondents. Key modules:
- **Project Management** — create/manage projects, assign users, track status
- **Transactions** — send gifts via Vinnet (telco top-up) and GotIt (e-voucher)
- **Quotation** — versioned cost quotation per project with approval workflow
- **MiniCATI** — phone survey respondent batches
- **TechcombankPanel** — panel analytics dashboard
- **TradeUnion** — recipient list email campaigns
- **Custom Voucher** — custom voucher assignment

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript, Vite, MUI v9 + MUI X date pickers v9, React Router v6, Axios, i18next (English / Vietnamese) |
| Backend | Laravel 11 (PHP 8.2+), Sanctum auth, Maatwebsite Excel |
| Database | MySQL (production), SQLite (local dev) |
| Infrastructure | Docker Compose (frontend + backend + db) |
| Testing & CI | Playwright e2e against a mocked API (frontend), PHPUnit feature tests (backend); GitHub Actions runs the frontend checks |

## Repository Layout

```
IPSOS-FINANCE-PAYMENT/
├── backend/          # Laravel 11 API
│   ├── app/
│   │   ├── Http/Controllers/   # One controller per resource
│   │   ├── Http/Requests/      # Form request validation
│   │   ├── Http/Middleware/    # EnsureUserHasRole, CatiAuthMiddleware
│   │   ├── Models/
│   │   ├── Exports/            # Maatwebsite Excel exports
│   │   └── Constants/
│   ├── routes/api.php          # All REST routes
│   └── database/
├── .github/workflows/frontend.yml   # CI: lint, build, e2e, screenshots against the base branch
├── frontend/
│   ├── e2e/                # Playwright specs; support/mockApi.ts is the fake API, support/test.ts the fixtures
│   └── src/
│       ├── config/
│       │   ├── ApiConfig.ts        # All API endpoint URLs (single source of truth)
│       │   ├── RoleConfig.ts       # RBAC visibility config
│       │   ├── ProjectFieldsConfig.ts
│       │   └── AccountFieldsConfig.ts
│       ├── hook/               # Custom hooks: data fetching + state
│       ├── components/         # Shared UI components
│       │   ├── Shell/          # AppShell: sidebar nav, user menu, project switcher, ⌘K palette
│       │   ├── Dialogs/        # FormDialog, ConfirmDialog, GenericDialog, RejectDialog
│       │   ├── Table/          # ResourceTable, ReusableTable, FilterChip, BulkActionBar, RowActions
│       │   ├── Modals/
│       │   └── Sidebar/        # Techcombank sidebar only
│       ├── pages/              # Route-level pages
│       ├── Layouts/            # DefaultLayout, ProjectLayout, TechcombankLayout
│       └── routes/
└── database/                   # SQL schema, migrations, backups
```

## Development Setup

```bash
# Backend
cd backend && cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan serve          # runs on :8000

# Frontend (Node 22)
cd frontend
npm install
npm start                  # Vite dev server on :3000
npm run lint
npm run build              # typecheck + production build into build/
npm run test:e2e           # Playwright against the mocked API (first time: npx playwright install chromium)

# Docker (full stack)
docker-compose up
```

## Frontend Conventions

### API Calls
- All endpoints live in `frontend/src/config/ApiConfig.ts`. Add new endpoints there; never hardcode URLs in components or hooks.
- Parameterised URLs use string `.replace('{paramName}', value.toString())` at call site.
- Auth token is stored in `localStorage` as `authToken` and sent as `Authorization: Bearer <token>`.
- Tokens expire after `sanctum.expiration` minutes (480). Login returns `expires_in`; `AuthContext` keeps the expiry in `localStorage` as `authTokenExpiresAt` and signs out on time (timer plus a check when the tab regains focus). A 401 from the API also signs out.

### Custom Hooks Pattern
Every resource has a dedicated hook in `frontend/src/hook/use<Resource>.ts`. The hook:
- Manages its own `ActionState` (`type | loading | error | message`)
- Exposes `fetchX`, `addX`, `updateX`, `deleteX` functions via `useCallback`
- Triggers `useEffect` on filter/pagination state changes

```ts
// ActionState shape — keep this consistent across all hooks
const [actionState, setActionState] = useState<ActionState>({
  type: 'idle',
  loading: false,
  error: false,
  message: ""
});
```

### Role-Based UI (RBAC)
- Visibility is configured in `frontend/src/config/RoleConfig.ts` via `BaseVisibility` + per-role `override` objects.
- Use `buildVisibility(role)` (or the `useVisibility()` hook) to get a merged visibility object; never check roles inline with string comparisons in JSX.
- Action/page permissions live in `ROLE_ACCESS` (mirrors `ensureUserHasRole` in `backend/routes/api.php`); check them with `hasRole(user?.role, ROLE_ACCESS.x)`.
- Routes: wrap pages with `<ProtectedRoute allowedRoles>` / `<RoleGate allowedRoles>`. Project sub-pages take their roles from `ProjectNavConfig.ts`, which also drives the project sidebar; top-level pages are listed in `AppNavConfig.ts`.
- Backend roles: `Admin`, `Finance`, `Scripter`, `Researcher`, `Field Manager`.

### UI Language
- The internal UI is available in English (default) and Vietnamese. Users switch in the account menu, or on the sign-in and password pages; the choice is kept in `localStorage` as `language`.
- Text lives in `frontend/src/i18n/locales/{en,vi}/*.json` (`common`, `nav`, `auth`, `projects`, `gifts`, `transactions`, `finance`, `statistics`, `quotation`, `settings`, `accounts`, `interviewers`, `cati`, `dashboard`) and is read with `useTranslation()`: `t("common.actions.save")`. Add every new string to both languages; the Vietnamese files are typed against the English ones, so a missing key fails the build.
- Labels kept in config files (`AppNavConfig`, `ProjectNavConfig`) are `TranslationKey`s; column configs (`transactionColumns()`, `employeeColumns()`, `catiBatchColumns()`) are functions so they read the current language, shown with `tKey(key)` inside a component that calls `useTranslation()`. Values that come from the data are looked up with `translateDataValue()`.
- Dates, statuses and field timing go through `utils/format.ts`, which follows the language (Vietnamese dates are `DD/MM/YYYY`; numbers keep `1,234,567` in both). MUI and the date pickers get their Vietnamese text from `i18n/AppLocaleProvider.tsx`.
- Not translated: respondent-facing pages (`CustomVoucher*`) and the interviewer screen (`MiniCATI`) stay Vietnamese; Excel import/export column headers stay as they are, since they are the file format users rely on; data from the database and messages from the backend are shown as sent.
- Counts use i18next plurals (`key_one` / `key_other`, called with `count`); pass the formatted number separately (`{{n}}`). Excel files generated in the browser keep English headers in both languages.
- Every page inside the app shell is translated. Quotation and operations field labels come from the Excel templates (`storage/schema/*_template.xlsx`) and are shown as written there. `ProgressReport` (`/progress`) is a mock-data prototype and stays English.

### Component Rules
- Use **MUI v9** components (`@mui/material`). Do not introduce a second UI library.
- MUI v9 API: `<Grid size={{ xs: 12, md: 6 }}>` (no `item`/`xs` props); spacing, colour and font weight go in `sx`, not as props (`<Typography mt={1}>` no longer works); sub-component props go through `slotProps` (`htmlInput`, `input`, `paper`, `primary`…), not `inputProps`/`PaperProps`/`primaryTypographyProps`; busy buttons use `<Button loading>`. Outline icons are named `XOutlineOutlined` (e.g. `DeleteOutlineOutlined`).
- Shared dialogs: `FormDialog` for short forms, `ConfirmDialog` for yes/no, `DetailDrawer` for details and long forms, `GenericDialog` for other custom content, `RejectDialog` for rejection with reason.
  Open `ConfirmDialog` through `useDialog()` (`<ConfirmDialog {...dialogProps} />`); use `tone: "danger"` plus an explicit `confirmText` for destructive actions. Never use `alert()` / `window.confirm()`.
- Feedback: never open a dialog only to show a message. Short confirmations and errors go to `useToast().showToast(message, severity)` from `contexts/ToastContext.tsx`; results the user needs to read (bulk send, skipped import rows) go in an inline `Alert`, e.g. `ResourceTable`'s `banner`.
- Buttons: plain MUI `variant="contained"` / `color="inherit"`; colors come from the theme in `config/ThemeConfig.ts`. Do not add CSS button classes.
- Page headers: top-level pages start with `<PageHeader title description actions />` (at most one contained button in `actions`).
- Project sub-pages: the header and breadcrumbs come from `ProjectLayout`, with title and description from `config/ProjectNavConfig.ts` (register new pages there, with their `group`); put page actions in `<ProjectPageActions>` and read project data with `useProjectContext()`.
- Lists: use `ResourceTable` (status `tabs`, search, `FilterChip` filters, `BulkActionBar`, `banner`, `EmptyState`, `onRowClick`) with `RowActions` for per-row actions; it wraps `ReusableTable`, which is used directly only for tables inside other components. Do not write one-off `<Table>` implementations.
- Charts: the statistics charts live in `components/Statistics/` (`TrendChart`, `HourChart`, `WeekHourHeatmap`, `WaitDistribution`, `BreakdownTable`) and share `chartKit.tsx` (axis ticks, tooltip, legend, one tab stop with arrow keys). New charts follow the same rules: bars at most 24px wide with a rounded data end, provider colours from `PROVIDER_STYLES`, one y-axis, a legend for two or more series, a tooltip on hover and keyboard focus. Wrap a chart or page block in `SectionCard`.
- Data display: `StatCard` for headline numbers, `CellStack` for two-line cells, `ProviderBadge` for Vinnet/GotIt, `SampleProgress` for sample progress, `UserAvatar` for people. Provider colours come from `PROVIDER_STYLES` in `config/ThemeConfig.ts`.
- Icons: prefer `@mui/icons-material` or `@phosphor-icons/react`.

### State Management
- No Redux. Local state + custom hooks only.
- Server state uses plain Axios inside hooks (not React Query), following the existing `ActionState` pattern.

### Testing
- `frontend/e2e/app.spec.ts` drives the real UI against `e2e/support/mockApi.ts` with a fixed clock. A test fails on any console error, so React/MUI warnings about props, keys or nesting count as failures.
- When a page calls a new endpoint, add its response to `mockApi.ts`. When you add a page or change a flow, extend `app.spec.ts` and `capture()` the screen.
- CI (`.github/workflows/frontend.yml`) runs lint, build and e2e on every PR that touches `frontend/`; these must pass. It also screenshots the base branch and the PR and compares them; changes show up as a warning, with before/after images in the `visual-diff` artifact.

## Backend Conventions

### Controllers
- One controller per resource. Keep controllers thin — business logic in models or service classes.
- Return JSON with consistent shape: `{ status_code, message, data }`.

### Routes
- All routes in `backend/routes/api.php`.
- Protected routes go inside `Route::middleware(['auth:sanctum'])->group(...)`.
- Role protection: `.middleware('ensureUserHasRole:Admin,Finance')` (comma-separated, case-sensitive as defined in `EnsureUserHasRole`).

### Form Requests
- Validate all incoming data in a dedicated `FormRequest` class in `app/Http/Requests/`. Never validate in controllers.

### Naming
- Controller methods: `index`, `show`, `store`, `update`, `destroy` (Laravel resource convention).
- Non-resource actions use descriptive names: `updateStatus`, `assignUsers`, `bulkImport`.

## Security Rules

- Never commit `.env` files. Only `.env.example` is tracked.
- The `private_key.pem` file (deleted from git history) must never be re-added.
- Auth token in `localStorage` is acceptable for this internal tool — do not change storage mechanism without explicit discussion.
- All admin-only routes must have `ensureUserHasRole:Admin` middleware on the backend. Frontend visibility gates alone are not sufficient.
- Input from external providers (Vinnet, GotIt API responses) must be validated before storing.

## Working with External Payment Providers

### Live and test respondents
- `ProjectRespondent::environmentFor()` is the only rule: test while the project is Upcoming (`in coming`) or On hold, or when the interviewer code (In field) or location code does not start with HN, SG, DN, CT or MA.
- A test respondent's gift is marked as received without calling Vinnet or GotIt. The stored `environment` is re-checked against the current project with `syncEnvironment()` when a gift is sent, and the Gifts page shows a Test chip.

### Interview and gift statistics
- `TransactionStatisticsService` feeds the Statistics page of a project and the Analysis tab of Finance (project id 0 = all projects, Admin and Finance only). The summary, the interview list and the Excel export read the same rows, so change the rule in one place.
- It counts every live interview; a gift is a successful Vinnet or GotIt transaction. "To review" is a gift sent more than `REVIEW_TOLERANCE_MINUTES` before the interview ended. Offline imports are left out of the timing figures.
- Filters live in the URL (`useStatisticsFilters`). Each breakdown ignores the filter on its own dimension, so picking an interviewer, a wait or an hour narrows the other charts.

### Respondent-facing endpoints
- The gift routes (`/project-management/vinnet/*`, `/gotit/*`, `/project/*`) have no login; the respondent token is the credential. Looking a gift up again (`check-transaction`) needs the token of the respondent who owns that transaction (`ProjectRespondentTokenService::respondentForTransactionLookup`).
- Sending a gift holds one per-respondent lock for both providers (`ProjectRespondent::giftLock()`), so a double click cannot buy twice. A respondent whose gift already went out through one provider is refused by the other (`deliveredGiftChannel()`, `status_code` 502, which the survey scripts treat as "gift already recorded"), so re-opening an interview neither buys a second gift nor changes the recorded channel. A refusal sent after the gift was delivered is not recorded either (same code).
- The transactions list and the date export take the provider of each row from the transaction itself (`CASE WHEN pvt.id IS NULL ...`), not from `project_respondents.channel`, which says `other` after a refusal. `php artisan gifts:fix-channels` reports (and with `--apply` corrects) respondents whose channel or refused status contradicts the gift they were delivered.
- Never log card PINs, voucher links or codes, the secret half of a respondent token, the project `remember_token`, or provider keys (Vinnet merchant key, GotIt API key). Log the public half of a token (`Str::before($token, '.')`) and transaction ids instead.

### Vinnet (telco top-up)
- Transactions use RSA-signed payloads. Crypto logic lives in `frontend/src/utils/CryptoCustom.ts`.
- Merchant key can be rotated via the Finance panel.

### GotIt (e-voucher)
- Account balance tracked via deposit records in `AccountDeposit`. Each deposit keeps who added it (`created_user_id`) and an optional note; the GotIt card on the Finance page lists them under Deposit history.
- Each transaction debits the balance; check balance before sending.

## Git & Branching

- Branch from `main`. Branch naming: `feat/<short-description>` or `fix/<short-description>`.
- Commit messages: `feat:`, `fix:`, `refactor:` prefixes.
- Do not force-push to `main`.
- Do not commit build artifacts (`frontend/build/`).

## Things to Avoid

- Do not add new npm packages without checking if MUI or an existing dependency already covers the need.
- Do not introduce `any` types in new TypeScript code. Extend existing config types or add new ones in `*Config.ts` files.
- Do not add comments that describe *what* code does. Only add comments when the *why* is non-obvious.
- Do not create additional CSS files — use MUI's `sx` prop or extend `frontend/src/assets/css/` files that already exist.
- Do not skip Laravel form request validation for new endpoints.
