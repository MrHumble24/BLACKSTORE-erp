# F35-BE-01 — App Store: demo login + public support/privacy pages

Agent: `backend-developer` (Opus). Work in the main tree, `server/` only.
Follow the rules in CLAUDE.md / `docs/rules/backend.md`.

## Why
The iOS app (`mobile/BlackStore-ERP`) is being submitted to the App Store. Apple needs:
1. a login for its reviewer on the production server, and
2. a public Support URL and Privacy Policy URL.

The owner chose a **Staff-role** demo user on production (Staff never sees cost, purchase price, profit or investor shares — NFR Security, FR-29).

## PRD items
FR-29 (users and roles), NFR Security (staff blind to cost/profit, no default credentials), NFR Language.

## Task 1 — seed a demo Staff user
In `server/prisma/seed.ts`, add `seedDemoUser(prisma)` next to `seedSuperAdmin`, same pattern:
- Reads `DEMO_PHONE` and `DEMO_PASSWORD`. If either is empty: log a warning and skip (no guessable default account).
- Upserts by phone, **create-only** (`update: {}`), name `App Review Demo`, role `STAFF_ROLE`, `isActive: true`, bcrypt hash cost 10.
- Add both keys to `server/src/config/env.validation.ts` (optional, default `''`, like `SUPER_ADMIN_*`) and to `server/.env.example` with placeholder values.
- Seed runs on every prod start (`pnpm start`), so setting the env vars on the server is enough.

## Task 2 — public legal pages
Two `@Public()` GET routes that return a small static English HTML page (`Content-Type: text/html`):

| Route | Content |
| --- | --- |
| `GET /api/legal/support` | App name, one-line purpose (ERP for phone/electronics stores), "accounts are created by your store administrator", contact email `support@abdulboriy.dev` |
| `GET /api/legal/privacy` | Privacy policy: data stored (staff name, phone, role; store customers' name/phone entered by staff; sales/stock records), purpose (running the store only), no tracking, no ads, no selling data, no third-party analytics, camera used only to scan barcodes/IMEI and images are not stored, hosted on the store's own server, deletion on request via the store administrator or the support email, effective date 2026-11-11 |

- New module `server/src/legal/` (module + thin controller). HTML may live in a small `legal-pages.ts` constant file. No DB, no service needed (KISS).
- Plain readable HTML with inline minimal CSS, mobile-friendly viewport meta. Must not be blocked by helmet CSP (inline `style` attribute/`<style>` — check helmet config and allow it for these routes only if needed).
- No auditing (read-only, no data).

## Done when
- `pnpm build` and `pnpm test` pass in `server/`.
- With the dev server running, `curl -i localhost:3000/api/legal/privacy` and `/support` return 200 HTML without auth.
- Running the seed with `DEMO_PHONE`/`DEMO_PASSWORD` set creates the user once; re-running doesn't change the password; unset → skipped.

## Result

### Files changed (all under `server/`)
- `prisma/seed.ts` — added a shared `seedUser(prisma, { envPrefix, roleName, name, label })` helper (create-only upsert, `isActive: true`, bcrypt cost 10; skips with a warning when `${envPrefix}_PHONE`/`_PASSWORD` empty). `main()` calls it for the super-admin (replacing the old `seedSuperAdmin`) and for the new App Store demo Staff user `App Review Demo`. Behaviour and warning strings unchanged.
- `src/config/env.validation.ts` — added optional `DEMO_PHONE` and `DEMO_PASSWORD` (default `''`).
- `.env.example` — added `DEMO_PHONE`/`DEMO_PASSWORD` placeholders with a comment.
- `src/legal/legal-pages.ts` (new) — `SUPPORT_PAGE` and `PRIVACY_PAGE` static English HTML with minimal inline `<style>` and viewport meta.
- `src/legal/legal.controller.ts` (new) — `@Public()` `GET /api/legal/support` and `/api/legal/privacy`; per-route `Content-Type: text/html; charset=utf-8` and a relaxed `Content-Security-Policy` allowing the inline style block.
- `src/legal/legal.module.ts` (new) — controller-only module.
- `src/app.module.ts` — registered `LegalModule`.

No DB schema change, no migration. No audit (read-only pages). Largest changed file 125 lines.

### Verification
- `pnpm build` — OK (prisma generate + oxlint --deny-warnings + nest build).
- `pnpm lint` — OK.
- `pnpm test` — 72 suites, 531 tests passed.
- Curl (fresh server on :3100, the port-3000 process was a stale instance left untouched):
  - `GET /api/legal/support` → `200`, `Content-Type: text/html; charset=utf-8`, `Content-Security-Policy: default-src 'self'; style-src 'unsafe-inline'`, body renders the support page.
  - `GET /api/legal/privacy` → `200`, same headers; body contains `barcodes and IMEI`, `support@abdulboriy.dev`, `Effective date: 2026-11-11`. Both without auth.
- Seed (dev DB, demo user deleted afterward):
  - Unset `DEMO_*` → `DEMO_PHONE/DEMO_PASSWORD not set — skipping demo user.`
  - Set → creates user `name=App Review Demo, role=Staff, isActive=t`, 60-char bcrypt hash.
  - Re-run with a different password → hash unchanged (create-only).

Code-review fix applied: the near-duplicate `seedSuperAdmin`/`seedDemoUser` were collapsed into one `seedUser` helper (DRY), identical behaviour; `pnpm build` and `pnpm test` (531 passed) re-run green, skip warning verified byte-identical.

Not committed, per instructions.
