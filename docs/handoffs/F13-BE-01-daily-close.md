# F13-BE-01 — Daily Close / Reconciliation (backend)

Working tree: main repo (`server/` only). Follow `CLAUDE.md` and `docs/rules/backend.md`.
Owner-approved extension beyond the PRD (anti-fraud: cash pocketing, fake returns, wrong calc).
A prd-guardian plan check informed every requirement below — do not re-litigate, implement as stated.

## Concept

A **BusinessDay** is open while the shop trades; the owner **closes** it (counts cash + card,
reviews returns/expenses/income, flags anything suspicious), which locks it and auto-opens the next
day. Sales stay live and real — "pending" only means "not yet reconciled by the owner"; it never
holds a sale or changes stock/debt (BR-8 balances stay live and correct regardless).

## Schema (Prisma) + migration

Add, with ONE migration (create it and apply to the local dev DB; money fields are `Decimal(12,2)`,
never float):

- `model BusinessDay { id, openedAt DateTime @default(now()), closedAt DateTime?, status DayStatus
  @default(OPEN), expectedCash Decimal?, countedCash Decimal?, cashVariance Decimal?, expectedCard
  Decimal?, countedCard Decimal?, cardVariance Decimal?, note String?, closedById Int?, closedBy
  User? }` with `enum DayStatus { OPEN, CLOSED }`. The expected/counted/variance values are an
  **immutable close-time snapshot** (BR-7 spirit) — frozen at close, never re-read as a live balance.
  *F28 (Oct 2026, owner decision): the Admin may later correct `countedCash`, `countedCard` and `note`
  of a CLOSED day via `PATCH /business-day/:id`; expected values stay frozen, variances are recomputed
  server-side, every correction is audited (FR-30). See `F28-API-01-closed-days-history.md`.*
- **Exactly one OPEN day** — add a partial unique index on `status` where `status = OPEN`
  (Prisma: `@@unique` won't do a partial; use a raw `CREATE UNIQUE INDEX ... WHERE status='OPEN'` in
  the migration). Seed the first OPEN `BusinessDay` in the migration (so there is always one).
- `model DayCloseFlag { id, businessDayId Int, businessDay BusinessDay, refType FlagRefType, refId
  Int, reason String, resolved Boolean @default(false), resolvedById Int?, resolvedAt DateTime?,
  createdAt DateTime @default(now()) }`, `enum FlagRefType { SALE PAYMENT RETURN EXPENSE INCOME }`.
- **Immutable window anchor (anti-backdating, prd-guardian #1):** add `createdAt DateTime
  @default(now())` to `SalePayment`, `Return`, and `LedgerEntry`. The reconciliation window keys off
  `createdAt` (server-set), NOT the existing editable `date` field. Keep `date` as the display/
  business date only.
- **Cash/card accuracy (prd-guardian #2, owner answered "a mix"):**
  - Add `inCash Boolean @default(true)` to `LedgerEntry` (true = from/into the cash drawer; false =
    bank/card). Expense & income creation accepts it.
  - Add `cashRefund Decimal @db.Decimal(12,2) @default(0)` to `Return` = the cash actually handed
    back (vs debt cancelled). Compute it **server-side** in the return service when a return is
    created: `cashRefund = max(0, refundAmount − debtCancelledPortion)` using the sale's outstanding
    balance at that moment (the client already shows this figure; the server is authoritative). Do
    not trust a client value.

## Reconciliation window + math

For the OPEN day, window = `createdAt >= openedAt AND createdAt < (closedAt or now)` — half-open
`[openedAt, closedAt)`; never `<=` on both ends (prd-guardian #3).

- `expectedCash = Σ SalePayment.amount(method=CASH) + Σ LedgerEntry.amount(type=INCOME, inCash) −
  Σ LedgerEntry.amount(type=EXPENSE, inCash) − Σ Return.cashRefund`  (all within the window).
- `expectedCard = Σ SalePayment.amount(method=CARD)`.
- (No card-refund path in v1 — returns are cash-back or debt-cancel only. Note it.)

## Endpoints

- `GET /business-day/current` (`@Permissions('close_day')`) → the open day + live `expectedCash`/
  `expectedCard` + review lists for the window: pending sales (id, seller, total, time), cash/card
  payment totals, returns (id, item, refundAmount, cashRefund, reason, user), expenses & income
  (id, category, amount, inCash). This screen is owner-only.
- `POST /business-day/close` (`@Permissions('close_day')`) `{ countedCash, countedCard,
  flags?: [{refType, refId, reason}], note? }` → in ONE `prisma.$transaction`:
  1. Assert a single OPEN day (`updateMany where status=OPEN` → expect 1 row; else conflict) —
     atomic, no double close (prd-guardian #3).
  2. Compute + freeze `expected*`, store `counted*` and `*Variance` on the day; set `CLOSED`,
     `closedAt=now`, `closedById`.
  3. Create `DayCloseFlag` rows for each flag.
  4. Auto-open the next `BusinessDay { openedAt: now }`.
  5. Write `AuditLog` for the close, for the auto-open (create), and for each flag (create) —
     FR-30 (prd-guardian #4).
- `POST /day-close-flags/:id/resolve` (`@Permissions('close_day')`) → set resolved + resolvedBy/At;
  audit the update.

## Permission

Add `'close_day'` to `ALL_PERMISSIONS`; grant to Admin + SuperAdmin (it is in `ADMIN_PERMISSIONS`);
NOT in `STAFF_PERMISSIONS`. Staff get 403 on all the above.

## Wire existing services

- Return service: compute + persist `cashRefund` (above). No behaviour change to refund/debt logic
  otherwise.
- Expense/income (LedgerEntry) create DTO + service: accept `inCash` (default true).
- These are the only touches to existing money flows; do not change profit/debt/stock behaviour.

## Acceptance
- Migration creates both tables + the three `createdAt` columns + `inCash` + `cashRefund`, seeds one
  OPEN day, and the partial unique index prevents two OPEN days.
- `GET /business-day/current` returns correct expected cash/card by the `createdAt` window and the
  review lists. Close stores frozen snapshot + variances, locks the day, opens the next, writes all
  audit rows; a second concurrent close fails cleanly.
- A money record whose editable `date` is backdated into a closed window does NOT change that closed
  day (window is on `createdAt`). 
- Returns persist `cashRefund`; cash expenses reduce expected cash, bank ones don't; cash income
  raises it.
- Staff → 403. Build + lint clean; unit tests for the expected-cash/card math (incl. a debt-cancel
  return contributing 0 cash, a bank expense excluded), the single-open-day invariant, and
  cashRefund computation. Money as decimal strings throughout.

## API contract (for F13-FE-01)
- `GET /business-day/current` → `{ day:{id,openedAt}, expectedCash, expectedCard, payments:{cash,
  card}, sales:[...], returns:[...], expenses:[...], income:[...] }` (decimal strings).
- `POST /business-day/close {countedCash, countedCard, flags?, note?}` → closed day snapshot.
- `POST /day-close-flags/:id/resolve`.
- Return create now also returns `cashRefund`; expense/income create accepts `inCash: boolean`.
