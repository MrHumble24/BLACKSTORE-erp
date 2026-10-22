You are the backend-developer agent of the BLACKSTORE project (Opus). Project root: /Users/abdulboriymalikov/projects/BLACKSTORE. Read `.claude/agents/backend-developer.md`, `CLAUDE.md`, `docs/rules/backend.md`, `server/prisma/schema.prisma` and the existing `server/src` (F01 is done: auth guards, `@Permissions`, `@Public`, `@CurrentUser`, `AuditService.log(entry, tx)`, Prisma exception filter, pagination DTO in `users/dto`). Reuse all of it. Work ONLY in `server/`. Use `pnpm`. Do not commit.

# F02: Master data — locations, categories, product models, investors
PRD: FR-3, FR-8, FR-9, FR-10, FR-30; BR-3, BR-4, BR-8, BR-12. Build exactly to `docs/handoffs/F02-API-contract.md` (read it fully first). If something there is impossible, build the closest thing and report the difference.

## Build
1. **Schema**: add `isActive Boolean @default(true)` to `Location`, `Category`, `ProductModel` and `Investor`. `npx prisma validate`, `npx prisma migrate dev --name master_data_is_active`, `npx prisma generate`.
2. **Permission**: add `manage_catalog` to `src/common/permissions.ts` (Admin-only list). The seed already upserts Admin from the full list; confirm by running `npx prisma db seed`.
3. **Modules** (one per feature, thin controllers, services hold logic): `src/locations`, `src/categories` (categories + attributes), `src/product-models`, `src/investors` (investors + transactions). Each with `dto/` and a `*.service.spec.ts`.
4. **Locations**: as in the contract. Lists: active only unless `?all=true` (one shared `ListQueryDto { all?: boolean }` in `src/common`, use `@Transform` for the string → boolean). Unique name → 409 via the existing P2002 filter.
5. **Categories**: `GET /categories` includes attributes ordered by `sortOrder`. `PATCH` must refuse (400) to change `isSerialized` when `Item` rows or `AccessoryStock` rows exist for a model of that category (count query inside the same transaction). Attributes: `key` lowercase snake_case (`@Matches(/^[a-z][a-z0-9_]*$/)`), unique per category (`@@unique` exists → 409), `options` required non-empty for SELECT and must be empty for others; `PATCH` accepts only label, options, required, sortOrder.
6. **Product models**: `GET` optional `categoryId` filter; unique `(categoryId, name)` → 409; `PATCH` only `name`. Do not expose `lowStockThreshold` (Phase 2).
7. **Investors**: two response shapes. `GET /investors` selects only `id, name, code, isOwn` (map `null` → `false` in the response). `GET /investors/:id`, `POST`, `PATCH` return the full `Investor` with `balance` computed by `aggregate` over `InvestorTransaction` (DEPOSIT sum − PAYOUT sum), returned as a decimal string. `POST` stores `isOwn: null` (never `false`; the column is `Boolean? @unique`). `PATCH` cannot change `isOwn`; deactivating the `OWN` investor → 400. `shareValue` validation per contract; force `0` when `shareType` is NONE.
8. **Transactions**: `GET` paginated newest first (reuse the pagination DTO); `POST` with `amount` as decimal string > 0 (validate with a regex `^\d+(\.\d{1,2})?$` and a positive check, convert with `Prisma.Decimal`), `date` optional ISO. No PATCH/DELETE.
9. **Audit**: every create/update of these entities calls `AuditService.log` inside the same `$transaction` with the current user, before/after.
10. **Seed**: extend `prisma/seed.ts` idempotently with the locations, categories + attributes and the `OWN` investor from the contract. Keep `seed.ts` under 300 lines; split into `prisma/seed/*.ts` files if needed.
11. **Tests**: unit tests for investors (shareValue rules, NONE → 0, balance computation, isOwn null on create, OWN cannot be deactivated) and categories (isSerialized change blocked when items exist, SELECT needs options). Extend the e2e test with: Staff gets `InvestorSummary` only (no `shareValue` key in the JSON), Staff gets 403 on `POST /locations`, Admin creates a category then an attribute, a deactivated location is missing from `GET /locations` but present with `?all=true`.

## Before you finish
- `pnpm build`, `pnpm lint`, `pnpm test` pass in `server/`; `pnpm test:e2e` if the local DB is up; `npx prisma validate`.
- No file over 300 lines, no function over 50 (`wc -l`).
- Report in under 40 lines: endpoints built, files added, seed result, anything skipped, and any difference from the contract.
