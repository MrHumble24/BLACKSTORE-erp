# F30-BE-01 — Daily close: walk-in purchases in the drawer + day events feed (backend)

Work in the main tree, `server/` only. Follow the rules in CLAUDE.md / GEMINI.md / AGENTS.md and `docs/rules/backend.md`.
Contract: `docs/handoffs/F30-API-01-day-events.md` (read it first). PRD items: F13, W5, FR-25, F27.
No schema change. Do not touch `src/telegram-bot/**`, `src/items/**`, `src/accessory-stock/**` (other uncommitted work).

## Build

1. **Drawer math** `src/business-day/business-day.reconcile.ts`
   - `ReconcileInput` gains `walkInPurchases: { unitPrice: Prisma.Decimal; quantity: number }[]`.
   - `computeExpected` subtracts `Σ unitPrice × quantity`; return it as `walkInPurchases` and also return `cashIncome`, `cashExpense`, `cashRefunds` so the service can build `breakdown` without recomputing. Update the doc comment formula.
   - `business-day.service.ts` `loadWindow`: add `purchaseLine.findMany({ where: { createdAt, walkInSellerId: { not: null } }, select: { id, unitPrice, quantity, createdAt, walkInSeller: { select: { name } }, item: { select: { productModel: { select: { name } }, identifiers: { select: { value }, take: 1 } } } } })`. Never select `Item.purchasePrice`/`extraCost` beyond what the feed needs (the page is Admin-only, but keep the selects tight).
   - `getCurrent` returns `breakdown` (five decimal strings) next to `expectedCash`.
2. **Events feed** — new `src/business-day/business-day.events.ts` (builder) and keep `business-day.service.ts` ≤ 300 lines (move the `*Select` constants and the `to*Row` mappers into `business-day.mappers.ts` if needed).
   - `loadEvents(client, openedAt, closedAt?)` runs the extra window queries in one `Promise.all` (sales/payments/returns/ledger/walk-in rows are already loaded by `loadWindow`; reuse them, do not query twice): supplier payments (`date`), investor transactions (`date`), batch lines (`purchaseLine` with `batchId not null`, `createdAt`, select `batch { id, supplier { name } }`, group per batch in memory), hand-added stock lines (`purchaseLine` with `batchId null` **and** `walkInSellerId null`, `createdAt`, select `unitPrice, quantity, item { productModel { name }, identifiers }, productModel { name }` → `STOCK_RECEIVED`, no drawer effect), consignments (`date`), consignment items sold (`soldAt`) and returned (`returnedAt`), transfers (`date`, with `_count` of items and accessories, from/to location names), stock counts (`startedAt`, `finishedAt`, location, user).
   - `buildEvents(window, extra)` maps every row to `DayEvent` per the contract table (one small mapper per kind, ≤ 15 lines each), concatenates, sorts by `time` desc then `id` desc. `cash`/`card` are signed decimal strings built with `Prisma.Decimal` (`"+200.00"`, `"-150.00"`), `null` when the effect is zero or there is none (a RETURN with `cashRefund = 0` → `cash: null`). `refType`/`refId` only for SALE, PAYMENT, RETURN, EXPENSE, INCOME.
   - Item labels: reuse `itemLabel()` from `common/item-brief.ts`.
   - `getCurrent` returns `events`.
   - Add a `// ponytail:` note: no pagination, one day of events; add it if a day ever exceeds a few hundred rows.
3. **Tests**
   - `business-day.reconcile.spec.ts`: a walk-in purchase of 150.00 (qty 1) and a buy-back line of 80.00 reduce expected cash by 230.00; `breakdown` numbers add up to `expectedCash`.
   - `business-day.events.spec.ts`: each kind maps to the contract shape (check `cash` sign, `null` for zero-cash returns, `refType` only on the five kinds, `STOCK_RECEIVED` only for lines with neither batch nor walk-in seller), ordering newest first across kinds, batch lines grouped into one `BATCH_RECEIVED` event with the summed amount.
   - **e2e** (`server/test/business-day.e2e-spec.ts`, keep ≤ 300 lines; split into `business-day-events.e2e-spec.ts` if needed): create a walk-in purchase via `POST /walk-in-purchases` as Staff (see `walk-in-purchases.controller.ts` for the body), then as Admin `GET /business-day/current`: `expectedCash` dropped by exactly the price paid, `breakdown.walkInPurchases` equals it, and `events` contains a `WALK_IN_PURCHASE` row with `cash === "-<price>"` and `refType === null`. Staff → 403 unchanged.

## Before you finish

`cd server && npm run lint && npm run build && npm test && npm run test:e2e -- business-day`. The stock-count e2e test (`operations`) fails on a leftover open count in the dev DB; known, not yours. Everything else green. Report the final `GET /business-day/current` shape and the files you touched.
