# F34-BE-01: Watches and matches core (ERP side)

Feature F34: Telegram device Watcher integration. Contract: `docs/handoffs/F34-API-01-watcher-contract.md` (read it first). Background: `WATCHER-INTEGRATION-ANSWERS.md` sections F1, F3, C3, H3 and 8.1. Agent: `backend-developer`. Follow the rules in CLAUDE.md and `docs/rules/backend.md`. Work in `server/` on the main tree.

PRD items: the Watcher feature is a client change request added on 2026-10-27 (not in the original PRD). It must respect BR-8 (nothing typed in that should be computed), BR-11 (exception approved in WATCHER-INTEGRATION-ANSWERS.md B5/8.2.5: `currency` is a label on Watch and Match only; no conversion, no sums across currencies, no currency anywhere else in the ERP), BR-9 (status changes through one allowed-list function), BR-12 (no hard delete; `isActive` instead), FR-29 (roles), FR-30 (audit log), NFR Security (Staff never see purchase-side data).

## Scope of this task
Database, permission, Watches CRUD, Matches list + status flow, audit. **No** Watcher HTTP calls and **no** webhook yet (F34-BE-02/03).

## 1. Prisma (one migration `f34_watches_matches`)
```prisma
model Watch {
  id             Int           @id @default(autoincrement())
  name           String
  aliases        String[]
  productModelId Int?
  productModel   ProductModel? @relation(fields: [productModelId], references: [id], onDelete: SetNull) // so the super-admin hard delete of a product model (hard-delete-exec.ts) still works
  maxPrice       Decimal?      @db.Decimal(12, 2)
  currency       String        @default("USD")
  isActive       Boolean       @default(true)
  syncedAt       DateTime?
  createdById    Int
  createdBy      User          @relation("WatchCreator", fields: [createdById], references: [id])
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt
  matches        Match[]
  @@index([isActive])
  @@index([productModelId])
}
enum MatchStatus { NEW SEEN CONTACTED BOUGHT IGNORED }
model Match {
  id                Int         @id @default(autoincrement())
  externalId        String      @unique
  watchId           Int
  watch             Watch       @relation(fields: [watchId], references: [id])
  status            MatchStatus @default(NEW)
  device            String
  price             Decimal?    @db.Decimal(12, 2)
  currency          String?
  condition         String?
  confidence        Decimal     @db.Decimal(4, 3)
  sellerName        String?
  sellerTelegramId  String?
  sellerUsername    String?
  messageText       String
  messageLink       String
  groupTitle        String
  parentText        String?
  messageAt         DateTime
  receivedAt        DateTime    @default(now())
  statusChangedAt   DateTime?
  statusChangedById Int?
  statusChangedBy   User?       @relation("MatchStatusChanger", fields: [statusChangedById], references: [id])
  note              String?
  @@index([watchId])
  @@index([status, receivedAt])
}
```
Add the back-relations on `User` and `ProductModel`. Use `cd server && npx prisma migrate dev --name f34_watches_matches`.

## 2. Permission
`manage_watches` in `server/src/common/permissions.ts`: in `ALL_PERMISSIONS`, placed before the super-only comment with a "never Staff" comment like `close_day`; not in `STAFF_PERMISSIONS`, not super-only (Admin and SuperAdmin get it through `ADMIN_PERMISSIONS`). Production deploy needs the seed re-run. Re-run the seed so Admin and SuperAdmin get it (`prisma db seed`). Tell the FE task to mirror it in `client/src/shared/config/permissions.ts`.

## 3. Module `server/src/watches/`
- `watches.controller.ts` (`@Controller('watches') @Permissions('manage_watches')`): `GET /watches` paginated (`PaginationQueryDto`, newest first, include `productModel { id, name }`), `POST /watches`, `PATCH /watches/:id`.
- DTOs: `create-watch.dto.ts` `{ name (1–200), aliases (string[] 0–30, each 1–60), productModelId? (int), maxPrice? (MONEY_REGEX decimal string), currency? ('USD'|'UZS') }`; `update-watch.dto.ts` = partial + `isActive?`.
- `watches.service.ts`: `create`, `update`, `findMany`. Aliases are trimmed, lower-cased, de-duplicated (no further normalisation; the Watcher does that). Every create/update writes an `AuditLog` row through `AuditService.log` (before/after). `updatedAt` naturally moves on any change, which is what the later sync cron compares against `syncedAt`. `syncedAt` is never set in this task.
- `matches.controller.ts` (`@Controller('matches') @Permissions('manage_watches')`): `GET /matches` paginated with optional `status` and `watchId` filters (query DTO), newest `receivedAt` first, `select` that **excludes** `sellerTelegramId`, includes `watch { id, name }`; `PATCH /matches/:id/status` `{ status }`; `PATCH /matches/:id` `{ note? (≤ 500) }`.
- `PATCH /matches/:id` (note) writes an `update` AuditLog row too (FR-30). Match audit before/after hold only the changed field (`{ status }` or `{ note }`). Add `'sellerTelegramId'` to `REDACTED_KEYS` in `server/src/audit/audit.service.ts` and update its comment. 404 when the watch or match does not exist (all three PATCH routes).
- `match-status.ts`: `MATCH_TRANSITIONS: Record<MatchStatus, MatchStatus[]>` exactly as in the contract, and `MatchesService.changeStatus(id, to, userId)` following `ItemsService.changeStatus` (`server/src/items/items.service.ts`): check the map (400), conditional `updateMany({ where: { id, status: from } })` (409 on 0 rows), set `statusChangedAt/ById`, audit. Inside `$transaction`.
- No `POST /matches` for users: match rows are only created by the webhook (next task). For this task's tests, create rows directly through Prisma in the spec setup.
- `watches.module.ts` holds both controllers and services; export nothing until another module needs it (the webhook and the sync cron of later tasks live in this same module).

## 4. Dashboard
Add `newMatchCount` (count of `Match` where `status = NEW`) in `DashboardService.summary()` only, not in `collect()`, so the owner Telegram snapshot is unchanged. Spread it only when the caller has `manage_watches`, leave it out otherwise (same pattern as the profit fields in `server/src/dashboard/dashboard.service.ts`).

## 5. Tests
Unit (Jest, mocked Prisma like `audit.service.spec.ts`): `match-status.spec.ts` (every allowed and one forbidden transition, 409 path), `watches.service.spec.ts` (alias cleaning, audit called), `matches.service.spec.ts` (select never contains `sellerTelegramId`). E2E (`server/test/watches.e2e-spec.ts`, pattern of `sales.e2e-spec.ts`): Admin creates a watch, lists it; Staff gets 403 on `GET /watches` and `GET /matches`. `afterAll` deletes the suite's matches and watches before `cleanupUsers` (Watch.createdById FK).

## Done means
`pnpm build`, `pnpm lint`, `pnpm test`, `pnpm test:e2e` pass in `server/`. Migration applied to the dev DB and the seed re-run. Then run `graphify update .` from the repo root. Report commands, outputs, changed files.
