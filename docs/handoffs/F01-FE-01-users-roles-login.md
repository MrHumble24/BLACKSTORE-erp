You are the frontend developer of the BLACKSTORE project. Work ONLY in `client/`. Read `GEMINI.md`, `AGENTS.md`, `docs/rules/frontend.md` and `.claude/agents/frontend-developer.md` first and follow every rule in them (Feature-Sliced Design, TanStack Query + axios + custom hooks, Zustand, shadcn/ui + Tailwind, max 300 lines per file, max 50 lines per function, YAGNI, KISS, DRY, every text translated to Uzbek and Russian). Do not touch `server/` or `docs/`. Use `pnpm` in `client/`. If the API contract below does not fit, build to the contract and report the mismatch at the end.

# Feature 1: Users, roles and login (PRD FR-29, FR-30, NFR Security, NFR Language)

The backend is being built in parallel to exactly this contract:

<contract>
# Feature 1: Users, roles and login — API contract

Base URL: `http://localhost:3000/api` (prefix `api`). Auth is an httpOnly cookie named `session`; the client sends it with `withCredentials: true`. All amounts/ids are plain JSON. Errors: `{ statusCode, message, error }` (Nest default). Validation errors: 400. Not logged in: 401. No permission: 403.

## Permissions (constants, one file on each side)
Admin has all. Staff has: `sell`, `transfer_stock`, `receive_batch`, `record_payment`, `buy_walk_in`, `consign`, `stock_count`, `view_stock`.
Admin-only: `view_cost`, `view_profit`, `delete_records`, `edit_past_records`, `manage_users`, `manage_prices`, `manage_investors`, `manage_suppliers`, `manage_expenses`, `view_audit_log`.

## Types
```ts
type Language = 'uz' | 'ru';
type Role = { id: number; name: 'Admin' | 'Staff'; permissions: string[] };
type User = { id: number; name: string; phone: string; language: Language; isActive: boolean; role: Role; createdAt: string };
type Page<T> = { items: T[]; total: number; page: number; pageSize: number };
```

## Endpoints
| Method | Path | Permission | Body | Response |
| --- | --- | --- | --- | --- |
| POST | /auth/login | public | `{ phone: string; password: string }` | `{ user: User }` + sets `session` cookie. 401 if wrong or user inactive |
| GET | /auth/me | logged in | – | `{ user: User }` |
| PATCH | /auth/me | logged in | `{ language: Language }` | `{ user: User }` |
| POST | /auth/logout | logged in | – | `204`, clears cookie |
| GET | /roles | logged in | – | `Role[]` |
| GET | /users?page=1&pageSize=20 | manage_users | – | `Page<User>` |
| POST | /users | manage_users | `{ name; phone; password; roleId; language? }` | `User` (201). 409 if phone exists |
| PATCH | /users/:id | manage_users | `{ name?; phone?; password?; roleId?; isActive?; language? }` | `User`. 400 if it would deactivate the last active Admin |

No DELETE anywhere (BR-12). `passwordHash` is never returned.

## Session rules
- Cookie: httpOnly, `SameSite=Lax`, `secure` outside development, path `/`.
- Sliding expiry: every authenticated request re-issues the cookie with a new expiry (SESSION_TTL_MINUTES, default 360 = 6 hours). Idle longer than that → 401.
- The auth guard loads the user from the DB on every request and rejects `isActive=false` immediately.
- Login is rate limited: 10 attempts per minute per IP → 429.

</contract>

## Build
1. **Scaffold FSD** in `client/src`: `app/` (providers: QueryClientProvider, router, i18n; global styles), `pages/`, `widgets/`, `features/`, `entities/`, `shared/`. Remove the Vite demo files (App.css, assets, demo App).
2. **Install**: `@tanstack/react-query`, `axios`, `zustand`, `react-router`, Tailwind (`tailwindcss`, `@tailwindcss/vite`), shadcn/ui (`npx shadcn@latest init -d`, then add `button input label card table dialog select dropdown-menu form sonner`), `react-i18next` + `i18next`. Nothing else unless truly needed; say why if you add more.
3. **shared/api**: one axios instance (`baseURL` from `VITE_API_URL`, default `http://localhost:3000/api`, `withCredentials: true`). A response interceptor: on 401 clear the auth store and go to `/login`. Add `client/.env.example` with `VITE_API_URL`.
4. **shared/config/permissions.ts**: the permission constants from the contract.
5. **shared/i18n**: `uz.json` and `ru.json`; every user-visible string goes through `t()`. Uzbek is Latin script. Default language `uz`.
6. **entities/user**: `User`, `Role`, `Language`, `Page<T>` types; `api/` with `useUsers(page)`, `useRoles()`, `useCreateUser()`, `useUpdateUser()` (TanStack Query hooks around the axios instance; invalidate `users` on mutation).
7. **features/auth**: Zustand store `useAuthStore` holding `user | null` and a `hasPermission(p)` helper. This store is the ONLY place the current user lives (do not also keep it in TanStack Query). `useLogin()` (POST /auth/login → set store), `useLogout()`, `useChangeLanguage()` (PATCH /auth/me → update store + i18n). On app start call GET /auth/me once to fill the store (loading state while it runs). `LoginForm` component (phone + password, shows the API error).
8. **features/manage-users**: `UserFormDialog` (create and edit: name, phone, password (required on create, optional on edit), role select, language select) and an activate/deactivate action. No delete button anywhere.
9. **widgets/app-shell**: layout with a sidebar nav and a header (user name, language switcher uz/ru, logout). Nav items are shown only if `hasPermission(...)` passes. For now the nav has: Users (`manage_users`). Leave a clear place for later items.
10. **pages**: `login` (public), `users` (needs `manage_users`: table with name, phone, role, language, active, edit button; pagination; "Add user" button), `home` (empty welcome, logged in). `ProtectedRoute` that redirects to `/login` if no user, and to `/` if the permission is missing.
11. Never render cost, purchase price or profit anywhere.

## Before you finish
- `pnpm build` and `pnpm lint` in `client/` pass with no errors.
- No file over 300 lines (`wc -l`), no function over 50 lines.
- Print a report: what you built, the list of files changed, dependencies added and why, anything skipped, and any contract mismatch.
