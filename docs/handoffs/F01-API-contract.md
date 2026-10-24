# Feature 1: Users, roles and login — API contract

Base URL: `http://localhost:3000/api` (prefix `api`). Auth is an httpOnly cookie named `session`; the client sends it with `withCredentials: true`. All amounts/ids are plain JSON. Errors: `{ statusCode, message, error }` (Nest default). Validation errors: 400. Not logged in: 401. No permission: 403.

## Permissions (constants, one file on each side)
Admin has all. Staff has: `sell`, `transfer_stock`, `receive_batch`, `record_payment`, `buy_walk_in`, `consign`, `stock_count`, `view_stock`.
Admin-only: `view_cost`, `view_profit`, `delete_records`, `edit_past_records`, `manage_users`, `manage_catalog` (added in F02), `manage_prices`, `manage_investors`, `manage_suppliers`, `manage_expenses`, `view_audit_log`.

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
