# F12-BE-01 — Super Admin: role, account, permissions (backend)

Working tree: main repo (`server/` only). Follow `CLAUDE.md` and `docs/rules/backend.md`.

## Feature

New **Super Admin** role, above Admin. Owner-approved extension beyond the PRD (not in the PRD's
Admin/Staff/Investor list). This task is the FOUNDATION only — it adds the role, a dedicated
super-admin login, and two new permission names that later tasks (F12-BE-02 Telegram config,
F12-BE-03 hard delete) will guard against. Do NOT implement Telegram or hard delete here.

Context: permissions are string lists on `Role` rows. Source of truth is
`server/src/common/permissions.ts` (`ALL_PERMISSIONS`, `STAFF_PERMISSIONS`, `hasPermission`).
Admin currently gets all permissions. Auth is phone + password (`User` model); seed is
`server/prisma/seed.ts`.

## Tasks

### 1. New permissions (super-admin-only)
- Add `'hard_delete'` and `'manage_integrations'` to `ALL_PERMISSIONS`.
- **Admin must NOT receive these two.** They are exclusive to Super Admin. Since Admin is seeded
  as "all permissions", change the seed/role definitions so Admin = `ALL_PERMISSIONS` **minus**
  these two super-only permissions, and Super Admin = `ALL_PERMISSIONS` (everything).
  Introduce `SUPER_ONLY_PERMISSIONS = ['hard_delete','manage_integrations']` and
  `ADMIN_PERMISSIONS = ALL_PERMISSIONS without SUPER_ONLY_PERMISSIONS` in `permissions.ts` so the
  split has one source of truth. Keep `STAFF_PERMISSIONS` unchanged.
- Add `SUPER_ADMIN_ROLE = 'SuperAdmin'` next to the existing `ADMIN_ROLE`/`STAFF_ROLE` constants.

### 2. Seed the SuperAdmin role + a SEPARATE super-admin user
- Seed a `Role { name: 'SuperAdmin', permissions: ALL_PERMISSIONS }` (idempotent upsert, like the
  existing roles).
- Seed a dedicated super-admin `User` (NOT the owner's Admin account), credentials from config:
  `SUPER_ADMIN_PHONE` and `SUPER_ADMIN_PASSWORD` (add to `env.validation.ts` and `.env.example`).
  - **No hard-coded fallback password.** If `SUPER_ADMIN_PASSWORD` is empty, skip creating the
    super-admin user and log a clear warning (do not seed a guessable default).
  - Hash the password with the same hasher used for other users. `isActive: true`.
  - Idempotent: upsert by phone; do not reset the password on every seed if the user already exists
    (so a changed password isn't overwritten) — only create when missing.
- Update the Admin seed so existing Admin loses the two super-only permissions on re-seed.

### 3. Make the permission split enforceable
- Confirm the `@Permissions(...)` guard (`server/src/auth/permissions.guard.ts`) already denies when
  a user's role lacks the permission (it does). Later tasks will annotate routes with
  `@Permissions('hard_delete')` / `('manage_integrations')`; nothing else to wire here.
- Add a tiny unit test asserting: SuperAdmin role includes `hard_delete` + `manage_integrations`;
  Admin role includes neither; Staff unchanged.

## Acceptance
- `ALL_PERMISSIONS` contains the two new names; Admin seed excludes them; SuperAdmin seed has all.
- Seeding creates the SuperAdmin role and, when `SUPER_ADMIN_PASSWORD` is set, one super-admin user
  that can log in via the existing phone+password auth; empty password → no user + warning.
- Build + lint clean; the permission-split unit test passes; existing auth/role tests still green.
- No Telegram, no hard-delete, no new business endpoints in this task.

## Notes for later tasks (do not build here)
- F12-BE-02 will guard Telegram config routes with `manage_integrations`.
- F12-BE-03 will guard hard-delete routes with `hard_delete` and should additionally re-check the
  user is the SuperAdmin role (defense in depth) — leave a short comment hook if convenient.
