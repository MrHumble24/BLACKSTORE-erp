# Watcher integration: answers from the ERP side

> **Note (2026-10-27):** where this analysis and `docs/handoffs/F34-API-01-watcher-contract.md` differ, the contract wins. Known differences: the signature covers `<timestamp>.<body>` (not the body alone); the Watcher keeps its own alert bot and the ERP's `matchAlerts` flag is off by default; the Watcher also retries 408 and 429; inactive watches are included in the sync; `newMatchCount` replaces `matchCount`; `parentText` was added to the webhook body.

Source PRD: "Malika Bazaar Device Watcher (Telegram Userbot) + ERP Integration", Draft v2.
Written 2026-10-27 against commit `1d12eb2` (main). Read-only research; no code, config or database was changed.

How to read this file: every question has an **Answer**, **Evidence** (paths and names in this repo) and a **Gap / effort** line. "NOT FOUND" means I looked and it does not exist; the place I looked is named.

Short glossary used below:
- **Cron job**: a function the server runs by itself on a timer.
- **Webhook**: an HTTP endpoint one service exposes so another service can push data to it.
- **HMAC**: a signature made from the request body plus a shared secret, so the receiver can check the sender is real.
- **Idempotent**: safe to receive the same request twice; the second one changes nothing.

---

## A. Project basics

### A1
Answer: Backend is NestJS 11 on Node 22 with Prisma 7 and PostgreSQL. Frontend is React 19 + Vite + TypeScript with TanStack Query, axios, Zustand, shadcn/ui and Tailwind. There is also a native SwiftUI iOS app. There is no Redis, no queue and no cache. The only background mechanism is `@nestjs/schedule` (cron jobs inside the server process).
Evidence: `server/package.json` (`@nestjs/common ^11`, `prisma 7.10.1`, `@prisma/adapter-pg`, `@nestjs/schedule ^5`, `@nestjs/throttler`, `helmet`), `client/package.json` (react 19.3, vite 8, `@tanstack/react-query` 5, axios, zustand, i18next, sonner), `server/src/prisma/prisma.service.ts`, `mobile/BlackStore-ERP/`.
Gap / effort: none for the question. Note for later: no Redis means no BullMQ inside the ERP.

### A2
Answer: One git repo holding three separate apps, each with its own `package.json` and lockfile. It is not a workspace monorepo (no root `package.json`).
Evidence (2 levels deep):
```
/
├── client/        src, public, scripts, index.html, vite.config.ts, package.json
├── server/        src, prisma, test, backups, Dockerfile, prisma.config.ts, package.json
├── mobile/        BlackStore-ERP/ (Xcode project, SwiftUI)
├── docs/          handoffs/, ops/, rules/, errors/, "Apple Store Inventory System — PRD.md"
├── graphify-out/  knowledge graph
├── CLAUDE.md, AGENTS.md, GEMINI.md, ALL_AGENT_RULES.md, PRODUCT.md
└── .claude/, .worktrees/ (git-ignored)
server/src/        one folder per feature module + common/, config/, prisma/
client/src/        app/, pages/, widgets/, features/, entities/, shared/
```
Gap / effort: none.

### A3
Answer: The only deploy artifact is a two-stage Docker image for the server. On start it runs `prisma migrate deploy && prisma db seed && node dist/main`. Comments say it runs behind nginx or Caddy. There is no docker-compose, no Coolify or GitHub Actions config, and no client Dockerfile. Redis is not running in production: it is not mentioned anywhere.
Evidence: `server/Dockerfile`, `server/.dockerignore`, `server/package.json` script `start`, `server/src/app.setup.ts` (comment "Behind nginx/Caddy in prod", `trust proxy`), PRD line "Hosting | Server in Germany (decided)", `docs/ops/restore.md`.
NOT FOUND: docker-compose*, Coolify files, `.github/`, fly.toml, render.yaml, Procfile (searched whole repo).
Gap / effort: medium if the Watcher is a second container. You need a compose file or Coolify project with Postgres + Redis + Watcher + ERP. Today nothing describes how the ERP itself is started in production.

### A4
Answer: Yes. `CLAUDE.md` plus `docs/rules/backend.md`, `docs/rules/frontend.md` and `ALL_AGENT_RULES.md`. Rules the Watcher work must follow on the ERP side:
- Claude only plans and writes handoffs. Backend code is written by the `backend-developer` agent, frontend by Gemini or OpenCode. Every task is a file in `docs/handoffs/` named `F<nn>-<BE|FE|API>-<seq>-<title>.md`.
- Before a feature: `prd-guardian` checks the plan. After: `code-reviewer`, `security-reviewer`, `prd-guardian` run in parallel.
- Max 300 lines per file, 50 per function. KISS, DRY, YAGNI.
- Backend: thin controllers, logic in services, DTOs with class-validator on every input, money as decimal strings, `@Permissions()` on routes, every create/change/delete writes an `AuditLog` row through `AuditService`, config only through `ConfigService`, `$transaction` for anything touching money or stock, paginate every list.
- Frontend: Feature-Sliced Design, TanStack Query hooks only (no raw axios in components), shadcn/ui + Tailwind, every string in `uz.json`, `ru.json`, `en.json` with identical keys, staff never see cost or profit.
- Always read `graphify-out/GRAPH_REPORT.md` first; run `graphify update .` after code changes.
Evidence: `CLAUDE.md`, `docs/rules/backend.md`, `docs/rules/frontend.md`, `ALL_AGENT_RULES.md`, `docs/handoffs/README.md`.
Gap / effort: none.

### A5
Answer: Prisma Migrate. Schema is `server/prisma/schema.prisma`; migrations live in `server/prisma/migrations/` (17 so far). To create one:
```
cd server && npx prisma migrate dev --name <name>
```
Production applies them automatically on container start (`prisma migrate deploy` in the `start` script). The e2e test DB is created and migrated by `pretest:e2e`.
Evidence: `server/prisma.config.ts`, `server/package.json` scripts `start`, `pretest:e2e`, `server/test/prepare-test-db.ts`, handoff convention in `docs/handoffs/F33-BE-01-sale-confirmation.md:24`.
Gap / effort: none.

---

## B. Products and devices

### B1
Answer: Three levels: `Category` → `ProductModel` → `Item`. One `Item` row is one physical device. Storage and color are not columns; they live in a JSON field. Accessories are counted by quantity in a separate table.

| Model | Key fields | Role |
|---|---|---|
| `Category` | `name @unique`, `isSerialized`, `isActive` | "iPhone", "MacBook", "Accessory" |
| `CategoryAttribute` | `categoryId`, `key`, `label`, `type TEXT/NUMBER/SELECT`, `options[]` | defines which attributes a category has (storage, color, ...) |
| `ProductModel` | `categoryId`, `name`, `lowStockThreshold?`, `isActive`, `@@unique([categoryId, name])` | "iPhone 15 Pro" |
| `Item` | `productModelId`, `investorId`, `locationId`, `status ItemStatus`, `condition`, `attributes Json`, `purchasePrice`, `salePrice?`, `minSalePrice?` | one device |
| `ItemIdentifier` | `itemId`, `type IMEI/SERIAL/SYSTEM_CODE`, `value @unique` | IMEI or serial |
| `AccessoryStock` | `productModelId`, `locationId`, `quantity`, `avgCost` | quantity stock |

Evidence: `server/prisma/schema.prisma` (735 lines; models above), seed attributes in `server/prisma/seed/master-data.ts` (`PHONE_ATTRS`: storage SELECT 64GB–1TB, color TEXT).
Gap / effort: none for storing. See B2 for naming.

### B2
Answer: The clean name is `ProductModel.name`, free text like "iPhone 15 Pro". Storage and color are in `Item.attributes` JSON, keyed by the category's attributes. No function builds "model + storage + color" into one string today. A watch should link to a `ProductModel` (optional) and keep its own `aliases` list as free text, because the catalog name alone will not match group slang like "17pm".
Evidence: `ProductModel.name` in `schema.prisma`; name helpers `itemLabel()` in `server/src/common/item-brief.ts`, `deviceName()` in `server/src/customer-notifications/warranty-select.ts` (both return model name only). Client `formatAttributes` in `client/src/entities/item/model/item.schema.ts:118` cleans form values, does not build a display string.
Gap / effort: small. Add an optional `productModelId` on the watch. Aliases stay free text. Nothing in the catalog needs to change.

### B3
Answer: No. There is no wanted item, purchase request, supplier order, pre-order or reservation. The PRD even forbids a "Reserved" status (BR-9). The only "want" signal is low-stock for accessories, which is a threshold on `ProductModel`, not for devices.
Evidence: `ProductModel.lowStockThreshold`, `server/src/accessory-stock/low-stock.ts`, `LowStockAlertsService` in `server/src/accessory-stock/low-stock-alerts.service.ts`. NOT FOUND for wanted / preorder / reserve / request / reorder in `schema.prisma`, `server/src`, `client/src`.
Gap / effort: none. A watch is a brand-new concept. It can later be created "from" a low-stock line, but v1 should not depend on that.

### B4
Answer: Yes, four kinds of people exist. None has a Telegram user id. `Supplier` needs only a unique `name`. `WalkInSeller` needs `name` + `phone`. `Customer` and `Investor` have `telegramChatId`, but that is a private chat id for the ERP's own bot, not a seller's Telegram user id.

| Model | Required | Telegram field |
|---|---|---|
| `Supplier` | `name @unique` | none |
| `WalkInSeller` | `name`, `phone` | none |
| `Partner` | `name` | none |
| `Customer` | `name`, `phone @unique` | `telegramChatId?` (bot chat) |
| `Investor` | `name`, `code` | `telegramChatId?` (bot chat) |

Evidence: `schema.prisma`; `server/src/suppliers/dto/create-supplier.dto.ts`; `server/src/walk-in-purchases/dto/create-walk-in-purchase.dto.ts` (phone regex `^\+?\d{7,15}$`).
Gap / effort: small. v1: store `sellerName`, `sellerTelegramId`, `sellerUsername` on the match row itself. Later (optional): add `telegramUserId?` to `Supplier` and a "save as supplier" button. Do not force a phone number, the group seller may not have given one.

### B5
Answer: No. One currency for everything (PRD BR-11; multiple currencies are out of scope). Money is `Decimal(12,2)`, sent over the API as a string, validated by a regex. The client shows it with no symbol, or with `$` on finance screens. There is no exchange rate anywhere.
Evidence: `schema.prisma` (every money field `@db.Decimal(12, 2)`), `server/src/common/money` (`MONEY_REGEX`), `client/src/shared/lib/formatMoney.ts`, `client/src/shared/lib/money.ts` (`CURRENCY = '$'`), `server/src/settings/settings.service.ts` (only setting key is `receipt`). NOT FOUND: rate / exchange / UZS.
Gap / effort: small. Store `maxPrice` and the match `price` as `Decimal(12,2)` plus a short `currency` string (`USD` or `UZS`) on watch and match only. Do not add currency to the rest of the ERP. Show the currency code next to the number on the two new pages.

---

## C. Creating watches from the ERP

### C1
Answer: Routing is one array in one file; the sidebar is one config file; permission gating is automatic. The natural home is a new nav group or the existing "purchasing" group, as two pages: `/watches` and `/matches`. Files to touch for a new page:
1. `client/src/pages/watches/` (new: `index.ts`, `ui/WatchesPage.tsx`) and the same for `matches`.
2. `client/src/app/routes/index.tsx`: add to `PROTECTED_ROUTES` (`{ path, permission, Component }`).
3. `client/src/widgets/app-shell/model/navConfig.ts`: add a `NavItem` to a group in `NAV_GROUPS`.
4. `client/src/shared/i18n/locales/{uz,ru,en}.json`: `nav.*` key and a `watches` / `matches` block.
5. `client/src/features/command-search/model/useCommandItems.ts`: the Cmd-K page list is hard-coded there, add the pages or they will not show in search.
6. If a new permission is added: `client/src/shared/config/permissions.ts` (see C3).
Evidence: `client/src/app/routes/index.tsx`, `client/src/app/routes/ProtectedRoute.tsx`, `client/src/widgets/app-shell/lib/useVisibleNav.ts`, `client/src/widgets/app-shell/ui/AppShell.tsx`.
Gap / effort: small. Adding a page is a well-worn path here.

### C2
Answer: Yes. Copy the **customers** slice: server-paginated table, search, a toggle filter, one dialog that does both create and edit, hooks per query and mutation.
- Page: `client/src/pages/customers/ui/CustomersPage.tsx`, `CustomersTable.tsx`, `CustomerDetailPage.tsx`.
- Entity: `client/src/entities/customer/api/index.ts` (`customerKeys`, `useCustomers`, `useCustomer`, `useCreateCustomer`, `useUpdateCustomer`), `model/types.ts`.
- Feature: `client/src/features/manage-customers/ui/CustomerFormDialog.tsx`.
- Shared: `shared/ui/TablePagination.tsx`, `shared/ui/TableRows.tsx`, `shared/lib/useCreateOrUpdate.ts` (toast + error state), `shared/api` (`api`, `getApiErrorMessage`).
- Pagination contract: query `page` and `pageSize` (server DTO `server/src/common/pagination-query.dto.ts`, max 100), response `Page<T> { items, total, page, pageSize }` (`client/src/shared/types/index.ts`).
- Server twin: `server/src/customers/customers.controller.ts`.
- For an on/off switch in the table: `shared/ui/ActiveToggleButton.tsx`, used by `entities/supplier/ui/SupplierActiveToggle.tsx`.
Evidence: paths above.
Gap / effort: none.

### C3
Answer: Permission strings, not role enums. A `Role` row holds a `permissions String[]`. Three roles are seeded: Admin (the owner), Staff, SuperAdmin. Server checks `@Permissions('x')` with a global guard; client mirrors the list and gates routes and nav. Adding a permission means editing both lists and re-running the seed (the seed overwrites role permissions).
- Server: `server/src/common/permissions.ts` (`ALL_PERMISSIONS`, 23 names; `STAFF_PERMISSIONS`; `SUPER_ONLY_PERMISSIONS`), `server/src/common/decorators.ts` (`@Permissions`, `@Public`, `@CurrentUser`), `server/src/auth/permissions.guard.ts`, `server/src/auth/auth.module.ts:29-30` (`APP_GUARD`), `server/prisma/seed.ts:54-66`.
- Client: `client/src/shared/config/permissions.ts`, `client/src/entities/session/model/auth.store.ts` (`useAuthStore.hasPermission`).
Recommendation: one new permission `manage_watches`, Admin and SuperAdmin only, never Staff. Watches reveal what the owner wants to buy and at what price, which is purchase-side information Staff do not see today.
Evidence: paths above; comment on `close_day` ("owner-only … never Staff") shows the precedent.
Gap / effort: small. Two list edits plus seed. Follow how `close_day` was added.

### C4
Answer: Single-tenant, multi-location. One business, one database. `Location` is a physical place (warehouse or shop). Users are global. There is no Store, Tenant or Company model, and no `storeId` on any table. Watches and matches should be global, not per user and not per location.
Evidence: `schema.prisma` (`Location { name @unique, type WAREHOUSE|SHOP }`; `locationId` only on `Item`, `AccessoryStock`, `Batch`, `Sale`, `StockCount`, `Transfer`), NOT FOUND for `storeId|tenantId|companyId`.
Gap / effort: none.

---

## D. Talking to the Watcher (outbound calls)

### D1
Answer: Plain global `fetch` to the Telegram Bot API, all in one file. There is no HTTP client library on the server, no timeout, no retry. The safe wrapper catches errors, logs a label, and returns false.
Evidence: `server/src/common/telegram.ts` (`sendMessage`, `sendDocument`, `getMe`, `getBotUpdates`, `safeSend`); callers in `server/src/accessory-stock/low-stock-alerts.service.ts:36`, `server/src/dashboard/owner-snapshot.service.ts:43`, `server/src/customer-notifications/customer-notifications.service.ts`, `server/src/backups/backups.service.ts:182`.
Gap / effort: small. Add one `WatcherClient` service in a new `server/src/watches/` module using `fetch` with `AbortSignal.timeout(5000)` and an `x-api-key` header. No new dependency. Retry is answered in D3.

### D2
Answer: One file declares and validates every env var at startup; the app refuses to start if one is wrong. Values are read with `ConfigService`.
To add the Watcher settings:
1. Add `WATCHER_URL` (`@IsUrl`, optional) and `WATCHER_API_KEY` (`@IsString`, optional) to the `EnvironmentVariables` class in `server/src/config/env.validation.ts`. Keep both optional so dev and tests boot without a Watcher.
2. Document them in `server/.env.example`.
3. Read them in the new `WatcherClient` through `ConfigService`.
Evidence: `server/src/config/env.validation.ts` (`EnvironmentVariables`, `validateEnv()`), `server/src/app.module.ts` (`ConfigModule.forRoot({ isGlobal: true, validate: validateEnv })`), `server/.env.example`. Side note: `TELEGRAM_ENC_KEY` is validated but missing from `.env.example`.
Gap / effort: small.

### D3
Answer: There is no outbox, retry or job table. All sends are best-effort and failures are only logged. But the ERP already uses cron jobs well, so a tiny outbox is cheap.
Recommended pattern: the ERP is the source of truth for watches. Each `Watch` row gets `syncedAt DateTime?`. Create / update / disable writes the row in the DB first (always succeeds), then tries to push to the Watcher once. If the push fails, `syncedAt` stays null or older than `updatedAt`. A cron job every minute pushes every watch where `syncedAt IS NULL OR syncedAt < updatedAt`. The UI shows a small "not synced" badge. No message is ever lost and no queue is needed.
Evidence for the cron pattern: `@Cron` in `server/src/accessory-stock/low-stock-alerts.service.ts:23`, `@Interval(5000)` with an `inFlight` guard in `server/src/telegram-bot/telegram-bot.service.ts`. NOT FOUND: outbox, `SchedulerRegistry`, attempts / sentAt columns.
Gap / effort: small. One column, one cron method, one badge.

---

## E. Receiving matches (inbound webhook)

### E1
Answer: No. The ERP has no inbound webhook at all. Telegram updates arrive by polling (`getUpdates` every 5 s), not by webhook. There is no HMAC or signature code anywhere. Only two routes are public: login (rate-limited) and health.
Evidence: `server/src/telegram-bot/telegram-bot.service.ts` (`poll`), `server/src/auth/auth.controller.ts` (`@Public()` + `@UseGuards(ThrottlerGuard)`), `server/src/health/health.controller.ts`. NOT FOUND: `hmac|createHmac|timingSafeEqual|webhook|signature` in `server/src` (one comment only, `link-token.service.ts:43`).
Gap / effort: medium. See E2 for the exact recipe.

### E2
Answer: A JWT in an httpOnly cookie named `session`. Two global guards: `JwtAuthGuard` then `PermissionsGuard`. A route opts out with `@Public()`. There are no API keys and no refresh tokens.
To add a public endpoint protected by an HMAC signature, copy the login route pattern:
1. Enable raw body capture: `NestFactory.create(AppModule, { rawBody: true })` in `server/src/main.ts` (and the e2e app factory). Needed because the signature must be computed over the exact bytes received.
2. Write `WebhookSignatureGuard` in `server/src/common/`: read header `x-watcher-signature`, compute `createHmac('sha256', secret).update(req.rawBody)`, compare with `timingSafeEqual`. Also check an `x-watcher-timestamp` header is within 5 minutes to stop replays.
3. Route: `@Public() @UseGuards(WebhookSignatureGuard, ThrottlerGuard) @Post('webhooks/watcher/match')`.
4. Secret `WATCHER_WEBHOOK_SECRET` in `env.validation.ts`.
Evidence: `server/src/auth/jwt-auth.guard.ts`, `server/src/auth/permissions.guard.ts`, `server/src/auth/auth.module.ts:29-30`, `server/src/common/decorators.ts`, `server/src/auth/auth.service.ts` (cookie flags), `server/src/app.setup.ts` (JSON body 1 mb, no rawBody), `ThrottlerModule.forRoot([{ ttl: 60_000, limit: 10 }])` in `auth.module.ts`.
Gap / effort: medium. New guard plus raw-body switch. It is the one piece of real security code in this integration, so it gets a unit test and the `security-reviewer` must look at it.

### E3
Answer: Yes, `@nestjs/schedule` cron jobs run inside the server process. There is no queue. The webhook handler should do the minimum: validate the DTO, insert the `Match` row, return 200. Anything slow (owner Telegram alert, enrichment) runs after the response or in the next cron tick.
Evidence: `ScheduleModule.forRoot()` in `server/src/app.module.ts`; crons listed in D3 and G1; fire-and-forget precedent `void this.notifications.sendSaleReceipt(detail)` in `server/src/sales/sales.service.ts:128`.
Gap / effort: small. Insert, then `void this.alerts.notifyOwner(match)`. If several ERP replicas ever run, crons would double-fire, but the ERP runs as one container today.

### E4
Answer: No general idempotency mechanism. The existing pattern is a unique column plus the global Prisma filter that turns a unique violation (`P2002`) into HTTP 409. For the webhook: put `@unique` on `Match.externalId` (the Watcher's `matchId`), insert, catch `P2002`, return 200 with `{ duplicate: true }`. Returning 200 (not 409) matters: the Watcher must stop retrying.
Evidence: `server/src/common/prisma-exception.filter.ts` (P2002 → 409), unique external ids in `schema.prisma` (`Customer.telegramChatId`, `TelegramLinkToken.token`, `ItemIdentifier.value`), one-time claim via `updateMany({ where: { id, usedAt: null } })` in `server/src/telegram-bot/link-token.service.ts`. NOT FOUND: `Idempotency-Key`, processed-event table.
Gap / effort: small.

---

## F. Storing and showing matches

### F1
Answer: Two new models in the house style: `Int` autoincrement ids, `createdAt`, `isActive` instead of delete, `@@index` on foreign keys and status, UPPER_CASE enums, money as `Decimal(12,2)`. Audit is done in code through `AuditService`, not a column.

```prisma
model Watch {
  id             Int           @id @default(autoincrement())
  name           String                         // "iPhone 17 Pro Max"
  aliases        String[]                       // lowercase, trimmed
  productModelId Int?                           // optional link to catalog
  productModel   ProductModel? @relation(fields: [productModelId], references: [id])
  maxPrice       Decimal?      @db.Decimal(12, 2)
  currency       String        @default("USD")  // "USD" | "UZS"
  isActive       Boolean       @default(true)
  syncedAt       DateTime?                      // last successful push to Watcher
  createdById    Int
  createdBy      User          @relation(fields: [createdById], references: [id])
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt
  matches        Match[]

  @@index([isActive])
  @@index([productModelId])
}

enum MatchStatus {
  NEW
  SEEN
  CONTACTED
  BOUGHT
  IGNORED
}

model Match {
  id               Int         @id @default(autoincrement())
  externalId       String      @unique            // Watcher matchId; idempotency
  watchId          Int
  watch            Watch       @relation(fields: [watchId], references: [id])
  status           MatchStatus @default(NEW)
  device           String
  price            Decimal?    @db.Decimal(12, 2)
  currency         String?
  condition        String?
  confidence       Decimal     @db.Decimal(4, 3)  // 0.000 – 1.000
  sellerName       String?
  sellerTelegramId String?
  sellerUsername   String?
  messageText      String
  messageLink      String
  groupTitle       String
  messageAt        DateTime                        // Watcher createdAt
  receivedAt       DateTime    @default(now())
  statusChangedAt  DateTime?
  statusChangedById Int?
  statusChangedBy  User?       @relation("MatchStatusChanger", fields: [statusChangedById], references: [id])
  note             String?

  @@index([watchId])
  @@index([status, receivedAt])
  @@index([sellerTelegramId])
}
```
Both `User` and `ProductModel` get the back-relations. Watches use `isActive` for "disabled", matching every other master-data model.
Evidence for conventions: `Supplier` (`schema.prisma:344-354`), `LedgerEntry` (`schema.prisma:645-658`, status enum), `AuditLog` model, `ItemsService.logUpdate` for the audit call shape.
Gap / effort: medium. One migration, two models, back-relations, seed untouched.

### F2
Answer: Smallest useful version is three pieces:
1. A `/matches` page: table with filters (status, watch), newest first, each row has the price, seller, a "open in Telegram" link (`messageLink`) and status buttons.
2. One extra row in the home page "needs attention" list: "N new offers" linking to `/matches?status=NEW`. The list already builds rows from summary counts (debtors, overdue partners, low stock), so this is a count field plus a row.
3. Owner Telegram push (see G1). That is the real-time channel; the web page is the work queue.
Skip a notification bell: there is none today and `NavItem` has no badge prop.
Evidence: `client/src/pages/home/ui/NeedsAttentionList.tsx`, `client/src/entities/dashboard/api/index.ts` (`useDashboardSummary`), `server/src/dashboard/dashboard.controller.ts` (`GET /dashboard/summary`), toasts via `sonner` in `client/src/app/providers/index.tsx`.
Gap / effort: small for the home row, medium for the matches page (a normal CRUD-style page).

### F3
Answer: `NEW → SEEN → CONTACTED → BOUGHT | IGNORED`, with `NEW → IGNORED` and `SEEN → IGNORED` allowed, and `IGNORED → NEW` allowed (undo). Nothing leaves `BOUGHT`. Copy the item status pattern: a `Record<MatchStatus, MatchStatus[]>` map and one `changeStatus` method that checks the map, does a conditional `updateMany({ where: { id, status: from } })` and returns 409 when the row moved meanwhile. This is the only transition guard in the codebase and it is the BR-9 pattern.
Evidence: `STATUS_TRANSITIONS` in `server/src/items/item-validation.ts:135`, `ItemsService.changeStatus` in `server/src/items/items.service.ts` (~line 257). Other statuses (Sale, Consignment, Expense, Day) use inline `if` checks, e.g. `server/src/sales/sale-payments.service.ts:37`.
Gap / effort: small.

### F4
Answer: Realistic for v2, not v1. The nearest existing flow is a **walk-in purchase**, which already models "buy one device from a person". It needs `seller{name, phone}`, `productModelId`, `locationId`, `identifiers[]` (IMEI or serial), `condition`, `pricePaid`. A match has none of the IMEI, location or phone, so the ERP cannot create it automatically. A v2 button "Buy this" can open the walk-in purchase form pre-filled with seller name, product model (if the watch is linked) and price. For v1, `BOUGHT` status plus `note` is enough.
Evidence: `server/src/walk-in-purchases/dto/create-walk-in-purchase.dto.ts`, `client/src/pages/purchases` (walk-in page route `purchases/walk-in`), batch DTOs in `server/src/batches/dto/`.
Gap / effort: v1 none. v2 small to medium (prefill through router state, no backend change).

---

## G. Notifications

### G1
Answer: Telegram only. No email, SMS or in-app notifications. All sending is in one file, with per-feature on/off flags stored in a settings row and edited by the SuperAdmin screen. The owner is reached through `alertChatId`. A match alert can reuse this path exactly like the low-stock digest:
1. `if (!await telegram.isFeatureEnabled('matchAlerts')) return;`
2. `const { token, alertChatId } = await telegram.getCredentials();`
3. `safeSend(logger, token, alertChatId, text, 'Match alert')`.
Text builders are plain functions in each feature, so add `buildMatchAlertText()` in the new module.
Evidence: `server/src/common/telegram.ts` (`sendMessage`, `safeSend`, `clampMessage`), `TelegramConfigService` in `server/src/integrations/telegram-config.service.ts` (`TelegramFeatures`: `lowStockDigest`, `ownerSnapshot`, `customerReceipts`, `debtReminders`, `warrantyReminders`, `investorReports`; `isFeatureEnabled`, `getCredentials`), `server/src/accessory-stock/low-stock-alerts.service.ts` (the pattern), text builders in `server/src/customer-notifications/customer-messages.ts`, DTO `server/src/integrations/dto/save-telegram.dto.ts`.
Gap / effort: small. One new flag (`matchAlerts`) in `TelegramFeatures`, `read()`, the DTO and the SuperAdmin Telegram page; one text builder; one call.

### G2
Answer: Yes, the ERP has a bot, written with raw `fetch` (no grammY or Telegraf), running in **polling** mode. The token is stored encrypted in the settings row, falling back to env `TELEGRAM_BOT_TOKEN`. The ERP does not read group messages as data and has no userbot or MTProto library.
**The Watcher must NOT share this bot token for receiving.** Telegram allows one `getUpdates` reader per token; a second poller gets 409 errors and steals updates, and setting a webhook would kill the ERP's polling. Sharing the token for **sending only** is technically fine, but it is cleaner for the Watcher not to send at all (see section 8.2): let the ERP send the alert through its existing bot and flags.
Evidence: `server/src/telegram-bot/telegram-bot.service.ts` (`poll`, `@Interval(5000)`, comment "the poller is the ONLY reader"), `docs/handoffs/F21-BE-01-telegram-chat-discovery.md` ("Two readers of one queue cannot both win"), `TelegramConfigService.getCredentials` / `env()`, `server/src/common/crypto.ts` (`TELEGRAM_ENC_KEY`), `server/package.json` (no telegram libraries).
Gap / effort: none if the Watcher does not need a bot. If it keeps its own bot for a direct alert, it must be a separate bot token.

### G3
Answer: No WebSocket or SSE. One client query uses `refetchInterval: 5000` (Telegram chat discovery). Live match display can be done the same way: `refetchInterval` on the matches query while the page is open, and on the home summary. The true "live" channel is the Telegram push to the owner's phone.
Evidence: `client/src/entities/integrations/api/index.ts:82` (`useTelegramChats`, `refetchInterval`), `refetchOnWindowFocus: false` in `client/src/app/providers/index.tsx`. NOT FOUND: `websocket|socket.io|EventSource|@Sse|WebSocketGateway` in both apps.
Gap / effort: small (one option on two queries). Skip WebSockets.

---

## H. Quality and safety

### H1
Answer: Server unit tests use Jest 30 with hand-built services and mocked Prisma (`new Service(mockPrisma)`), 63 spec files. Server e2e tests use supertest against a real `<db>_test` database that `pretest:e2e` creates, migrates and seeds. Client uses Vitest (3 tests). The handoff for the Watcher module should ask for: unit tests for the status map, the HMAC guard and the alias normaliser; one e2e test posting a signed webhook twice (second returns duplicate).
Evidence: `server/package.json` (jest config inline), `server/src/audit/audit.service.spec.ts`, `server/test/jest-e2e.json`, `server/test/prepare-test-db.ts`, `server/test/sales.e2e-spec.ts`, `client/src/widgets/partner-transactions/model/period.test.ts`.
Gap / effort: none.

### H2
Answer: Nest `Logger` per class. One global exception filter maps Prisma errors to HTTP codes. Health endpoints exist for a monitor. No Sentry, no request logger.
Evidence: `server/src/common/prisma-exception.filter.ts` (`APP_FILTER`), `server/src/health/health.controller.ts` (`/api/health`, `/api/health/live`), `Logger` in 12 services. NOT FOUND: Sentry, pino, winston, morgan, global interceptor.
Gap / effort: none for v1. Log webhook rejects (bad signature) at `warn` with the IP, never the body.

### H3
Answer: Rules that apply to the new code:
- Helmet, CORS to one origin, global `ValidationPipe` with `whitelist` + `forbidNonWhitelisted` + `transform`, JSON body limit 1 mb.
- Rate limit is only on login today; the webhook route should also get `ThrottlerGuard`.
- Every create / change / delete writes an `AuditLog` row through `AuditService.log` (it redacts `passwordHash` and `telegramChatId` automatically). Watch create/update/disable and match status changes must be audited. Match inserts from the webhook can be audited with `userId` null or a system user, decide in the handoff.
- Never log tokens or personal data. Seller Telegram id counts as personal data.
- Secrets only through `env.validation.ts`.
Evidence: `server/src/app.setup.ts` (`configureApp`), `server/src/auth/auth.module.ts` (throttler), `server/src/audit/audit.service.ts` (`log`, `logMany`, `REDACTED_KEYS`), `docs/rules/backend.md`, `ALL_AGENT_RULES.md` §10.
Gap / effort: small. Add `sellerTelegramId` to `REDACTED_KEYS` if match rows are audited.

### H4
Answer: Risks I see, in order of importance:
1. **First public write endpoint.** Today nothing outside the login form can write to the ERP without a session. The webhook opens a door. HMAC with raw body, timestamp check, rate limit and a strict DTO close it. No other route should ever be `@Public()` for the Watcher.
2. **Watcher calling the ERP's Postgres directly** would bypass audit, validation and permissions. Keep it HTTP-only.
3. **Bot token conflict** if the Watcher polls with the ERP's bot token (G2). Use a separate bot or no bot.
4. **Personal data.** Seller names and Telegram ids from a public group are stored in the ERP. Keep them off Staff screens (`manage_watches` is Admin-only) and out of logs.
5. **Silent desync.** If the push to the Watcher fails and nobody notices, watches are "on" in the ERP but dead in the Watcher. The `syncedAt` badge and the re-push cron handle this.
6. **Flood of matches** on a busy day could spam the owner. Add a per-watch cooldown in the Watcher (one alert per seller per watch per hour) and keep a daily cap.
7. **Deploy surface.** The ERP has no compose file. Adding Redis + Watcher means someone must finally write the production compose or Coolify setup. That is good hygiene but it is new work.
Evidence: E1, E2, G2, D3, A3 above.
Gap / effort: covered by the items above.

---

## I. Decision: where should the Watcher live?

### I1
Answer: **Option 1, separate service. Firm recommendation.**

**Option 1: separate repo and service, own database, HTTP to the ERP**
- Pro: the userbot needs a logged-in personal Telegram account with GramJS, Redis and BullMQ. None of that exists in the ERP, and the ERP rules forbid new dependencies without a reason. Keeping it out protects the ERP's small, boring dependency list.
- Pro: a GramJS session, a flood-wait, or a Gemini outage cannot crash the ERP process. The ERP runs sales, cash drawer and daily close. It must not share a process with an experimental listener.
- Pro: the ERP is single-container today with in-process cron. A userbot is a long-lived connection; putting it inside means every ERP restart (deploys, migrations on start) drops the Telegram session.
- Pro: different release pace. The Watcher will change daily while you tune aliases and prompts. The ERP has a review gate per feature.
- Pro: the ERP side stays tiny (one module, two tables, one guard), see section 8.1.
- Con: two deployables, two databases, one more secret pair, and the `externalId` / `syncedAt` sync logic. All small.
- Con: no production compose exists yet, so the first deploy is more work than "add a module".

**Option 2: a module inside the ERP backend, shared database and deploy**
- Pro: no HTTP contract, no HMAC, no sync. Watches and matches are plain tables and services.
- Pro: one deploy, one set of logs.
- Con: pulls GramJS, Redis, BullMQ and the Gemini SDK into a NestJS app whose rules say "add a dependency only if nothing existing covers it". The `code-reviewer` and `security-reviewer` agents would flag it.
- Con: a personal Telegram session string inside the ERP container widens the blast radius of any ERP compromise to your personal Telegram account.
- Con: the ERP's cron and polling already assume a single process. A userbot plus BullMQ workers in the same process make scaling or restarting the ERP harder.
- Con: the ERP tests run against a real Postgres; adding Redis makes `pretest:e2e` and CI heavier for every feature, not only this one.

Why Option 1 in plain words: the ERP is the cash register. The Watcher is a scout with a radio. You do not bolt the radio onto the cash register; you give the scout a phone number to call. The call is the webhook, and the ERP already knows how to receive and audit calls once we add one signed door.

One refinement to Option 1: the Watcher should be **thinner** than the PRD describes, see section 8.2. Let the ERP own the watch list and the owner alert; let the Watcher own only listening, filtering, Gemini and the match webhook.

---

## 8. Final output

### 8.1 ERP changes needed

**Database** (one migration)
- [ ] `Watch` model, `Match` model, `MatchStatus` enum, back-relations on `User` and `ProductModel`. **medium**

**Backend** (new module `server/src/watches/`, all under `@Permissions('manage_watches')` except the webhook)
- [ ] `manage_watches` permission in `server/src/common/permissions.ts` (Admin + SuperAdmin). **small**
- [ ] `WatchesController` + `WatchesService`: `GET /watches` (paginated), `POST /watches`, `PATCH /watches/:id` (name, aliases, maxPrice, currency, productModelId, isActive). Audit every change. **medium**
- [ ] `MatchesController` + `MatchesService`: `GET /matches` (paginated, filter by status and watchId), `PATCH /matches/:id/status` through a `STATUS_TRANSITIONS` map + `changeStatus`. Audit. **small**
- [ ] `WatcherClient`: `fetch` with 5 s timeout and `x-api-key`; `pushWatch(watch)`; `syncedAt` update. **small**
- [ ] `WatchSyncService`: `@Cron` every minute re-pushes unsynced watches, `inFlight` guard. **small**
- [ ] `WebhookSignatureGuard` in `server/src/common/` (HMAC-SHA256 over raw body + timestamp window) and `rawBody: true` in `main.ts` and the e2e factory. **medium**
- [ ] `POST /webhooks/watcher/match`: `@Public()`, signature guard, `ThrottlerGuard`, DTO, insert with `externalId @unique`, catch P2002 → 200 `{ duplicate: true }`, then `void notifyOwner(match)`. **small**
- [ ] `matchAlerts` flag in `TelegramFeatures`, `read()`, `save-telegram.dto.ts`; `buildMatchAlertText()`; send via `safeSend` to `alertChatId`. **small**
- [ ] `matchCount` (status NEW) in `GET /dashboard/summary`. **small**
- [ ] Env: `WATCHER_URL`, `WATCHER_API_KEY`, `WATCHER_WEBHOOK_SECRET` in `env.validation.ts` + `.env.example`. **small**
- [ ] Tests: unit for transitions, guard, alias normaliser; e2e for signed webhook + duplicate. **small**

**Frontend**
- [ ] `entities/watch` and `entities/match` (types, query keys, hooks). **small**
- [ ] `pages/watches` (table, active toggle, "not synced" badge) + `features/manage-watches/WatchFormDialog` (name, aliases as tag input, optional product model select, max price, currency). Copy the customers slice. **medium**
- [ ] `pages/matches` (table, status + watch filters, Telegram link, status buttons, note). **medium**
- [ ] Route entries, nav item(s), Cmd-K entries, `manage_watches` in `shared/config/permissions.ts`, uz/ru/en keys. **small**
- [ ] "New offers" row in `NeedsAttentionList`. **small**
- [ ] `matchAlerts` toggle on the SuperAdmin Telegram page. **small**

**Config / ops**
- [ ] Production compose (or Coolify project) describing ERP + Postgres + Watcher + its Postgres + Redis. **medium** (new, but overdue regardless of the Watcher)
- [ ] Shared secrets created once and stored in both services' env. **small**

Rough total for the ERP side: two backend handoffs and two frontend handoffs, about one feature cycle under the project's normal gate.

### 8.2 Changes to this PRD

1. **Make the ERP the owner of watches; make the Watcher stateless about them.** Section 6.1 proposes full CRUD on the Watcher. Simpler: the ERP keeps watches in its own DB and pushes the full active list with `PUT /watches/sync` (array of `{ externalId, name, aliases, maxPrice, currency }`). The Watcher replaces its in-memory or DB copy. No `GET /watches`, `DELETE`, or `PATCH` on the Watcher. No two-way reconciliation. If the Watcher restarts it asks the ERP nothing; the ERP's minute cron re-pushes anyway. Keep `GET /matches` off the Watcher too; the ERP already stores every match it received.
2. **Drop the Watcher's own notification bot (section 4 step 7, 5.4).** The ERP already has a bot, the owner's chat id, encrypted token storage and per-feature flags. Let the webhook trigger the alert from the ERP. One bot, one place to turn it off. If you want a backup channel in case the ERP is down, keep the Watcher bot but with its own token, never the ERP's.
3. **Sources (groups) stay inside the Watcher** for v1. Section 6.1 proposes `/sources` endpoints for the ERP to manage groups. The ERP has no screen for that and v1 has one group. Manage sources in the Watcher's own config or DB, add an ERP screen in M6 if it is still wanted.
4. **Webhook contract additions** (section 6.2): add `sellerUsername`, `watchExternalId` becomes the ERP's numeric watch id as a string, add headers `x-watcher-signature` (hex HMAC-SHA256 over the raw body) and `x-watcher-timestamp` (unix seconds). ERP replies `200 { id, duplicate: boolean }`. Retry on 5xx and network errors only; a 4xx means a contract bug, log it and stop.
5. **Currency.** The ERP is single-currency (BR-11). Watch and match carry a `currency` code, but no conversion. If a seller quotes UZS and the watch is in USD, the ERP shows both numbers as text and lets you judge. Gemini should return the currency as it saw it, not convert.
6. **Device identity.** Add optional `productModelId` to the watch. Aliases remain the matching key; the model link is only for later "Buy this" prefill.
7. **Match statuses** are an ERP concern, not a Watcher concern. Remove any status from the Watcher's match table except "sent to ERP: yes/no".
8. **"Never lose a message if the ERP is down" (5.5)**: BullMQ retry on the webhook job covers this; keep attempts high (24 × 5 min) because the ERP applies migrations on restart.

### 8.3 Open questions for you

1. **Who sees matches?** I propose Admin and SuperAdmin only. Should Staff ever see them, for example to call the seller?
2. **Watch granularity.** Is a watch "iPhone 17 Pro Max" with any storage and color, or do you want storage and color as separate filters (which Gemini must then extract)?
3. **Alert rules.** Alert when the price is above `maxPrice` (as a lower-priority message), or only at or below? Alert for `asking` intents at all (someone else is also hunting), or never?
4. **Cooldown.** One alert per seller per watch per hour acceptable?
5. **Retention.** Keep matches forever (they are small) or auto-ignore after N days? The ERP never hard-deletes, so "forever + filter" is the default.
6. **Deploy.** Same server as the ERP (Germany) in one compose, or a second box? This decides whether Redis and the Watcher's Postgres share the host.
7. **Audit identity for webhook inserts.** Audit match inserts under a system user, or not audit inserts and only audit status changes?
8. **Telegram alert text.** Should it include the seller's name and a deep link to the message, or only the device and price (less personal data in a chat history)?

### 8.4 Suggested order of work (ERP side, small steps)

Each step is one handoff file and one review cycle. Steps 1 to 3 can start before the Watcher exists; the webhook can be tested with a signed `curl`.

1. **F34-BE-01 Watches and matches core.** Migration, permission, `WatchesService`, `MatchesService` with status map, controllers, audit, unit tests. No Watcher calls yet.
2. **F34-FE-01 Watches page.** Entity, form dialog, table, nav, i18n. Can run in parallel with step 1 once the API contract file `F34-API-01` is written.
3. **F34-BE-02 Inbound webhook.** `rawBody`, `WebhookSignatureGuard`, `POST /webhooks/watcher/match`, idempotent insert, `matchAlerts` flag and owner Telegram alert, `matchCount` in dashboard summary, e2e test with a signed request. `security-reviewer` focus.
4. **F34-FE-02 Matches page + home row.** Table, filters, status buttons, Telegram link, "New offers" row, `matchAlerts` toggle on the SuperAdmin page.
5. **F34-BE-03 Outbound sync.** `WatcherClient`, `syncedAt`, sync cron, "not synced" badge field in the list response. Small FE follow-up for the badge.
6. **Ops.** Production compose or Coolify project, secrets, health checks for both services. Then the Watcher's M5 milestone can be closed end to end.

Steps 1 to 4 give you a usable "offers inbox" even if you paste matches by hand with `curl`. Step 5 makes watch editing reach the Watcher without copying. Step 6 is the only part that cannot be done inside this repo alone.
