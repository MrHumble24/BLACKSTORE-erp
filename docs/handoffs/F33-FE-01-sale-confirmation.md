# F33-FE-01 — Sale confirmation at the daily close (frontend)

Work in the main tree, `client/` only. Follow the rules in CLAUDE.md / GEMINI.md / AGENTS.md and `docs/rules/frontend.md` (FSD, TanStack Query hooks, shadcn/ui, Tailwind, i18n in uz/ru/en with identical keys, ≤300 lines per file, ≤50 per function, `useWatch` never `watch()`).
Contract: `docs/handoffs/F33-API-01-sale-confirmation.md` (read it first). Precedent to copy: F32 (`entities/walk-in-purchase`, `features/confirm-walk-in-payout`, `pages/close-day/ui/WalkInPayoutsTile.tsx`, `pages/items/ui/ItemWalkInCard.tsx`). Pages: `/close-day` (Current tab), `/sales`, `/sales/:id`.
A parallel Gemini session polishes other UI; do not touch `features/sell/**`, `features/consign/**`, `pages/accessories/**`, `pages/partners/**`, `pages/items/**`. Locale files may have uncommitted changes; add keys, revert nothing. No new dependencies.

## Build

1. **`entities/sale`**: `SaleSummary` gains `confirmedAt: string | null`, `confirmedBy: NamedRef | null`, `canUndo: boolean`; `SaleFilters.confirmed?: boolean` sent as `confirmed=true|false`. Hooks `useConfirmSale()` → `PATCH /sales/:id/confirm`, `useUnconfirmSale()` → `/unconfirm`, `useConfirmSales()` → `PATCH /sales/confirm { ids }`; all invalidate `saleKeys.all` and `businessDayKeys.all`. Comments.
2. **`entities/business-day/model/types.ts`**: `OpenDaySaleRow` gains `confirmedAt`, `confirmedBy`; `CurrentBusinessDay` gains `pendingSales: (OpenDaySaleRow & { paidCash: string; paidCard: string; party: string | null })[]` (party = customer or partner name), `pendingSalesCount: number`, and `breakdown.pendingSalesCash/pendingSalesCard`, `breakdown.paymentsCard`; `DayEventKind` gains `'SALE_CONFIRMED'`.
3. **`features/confirm-sale`** (new, mirror `features/confirm-walk-in-payout`): `SaleConfirmActions({ saleId, confirmedAt, canUndo })` (Confirm / Undo, `close_day` only, disabled while pending, toasts `sale.confirmed`, `sale.confirmUndone`, `sale.confirmFailed`) and `ConfirmAllSalesButton({ ids })` (bulk, disabled when empty, toast `sale.confirmedMany` with `{{n}}`). Public `index.ts`.
4. **Close-day, Current tab**:
   - New `SalesWaitingTile.tsx`: review-style card (reuse `ReviewTile`/`RowBody` exports) titled `sale.waitingTitle` with the count chip and a **Confirm all** button in the header; rows from `data.pendingSales`: date (`formatDate`), `#id`, seller, customer or partner name (`party`, dash when null), cash and card amounts (`money`), `SaleConfirmActions` with `canUndo={false}`. The Confirm-all label carries the listed count: `sale.confirmAll` = "Confirm all ({{n}})". Empty state `sale.noneWaiting`. Place it above the review tiles in `CurrentDayTab.tsx`.
   - `ReviewSection.tsx` Sales tile: each row shows a small "Confirmed" tick or "Waiting" badge (`sale.statusConfirmed` / `sale.statusWaiting`).
   - `ReconcileHero.tsx` breakdown: cash sales line reads `closeDay.breakdownSales` (confirmed only) and a muted `closeDay.breakdownSalesPending` ("Sales waiting (not counted)") showing cash; the card card shows the same two for card (`breakdown.paymentsCard`, `pendingSalesCard`).
   - Sticky close bar (`CurrentDayTab.tsx`): when `pendingSalesCount > 0`, show an amber note `closeDay.pendingSalesWarning` ("{{n}} sales not confirmed", n = `pendingSalesCount`) next to the variance badges; do **not** block the button.
   - `DayEventRow.tsx` kind map: add `closeDay.kind.SALE_CONFIRMED` ("Sale confirmed"), money-in colour.
5. **Sale detail** `pages/sales/ui/`: in `SaleHeader.tsx` or `SaleMetrics.tsx` (whichever already shows status), add the status line `sale.confirmedOn` ("Confirmed on {{date}} by {{name}}") / `sale.confirmedOnNoUser` / `sale.waiting` and `SaleConfirmActions` with `canUndo={sale.canUndo}`.
6. **Sales list** `pages/sales/ui/SalesTable.tsx` + `SalesFilters.tsx`: status badge column and a status select All / Waiting / Confirmed (`sale.filterAll`, `sale.statusWaiting`, `sale.statusConfirmed`) mapped to `filters.confirmed`.
7. **i18n**: identical keys in `uz.json`, `ru.json`, `en.json`: `sale.waitingTitle`, `sale.noneWaiting`, `sale.confirm` ("Confirm"), `sale.confirmAll` ("Confirm all"), `sale.undo`, `sale.confirmed`, `sale.confirmedMany`, `sale.confirmUndone`, `sale.confirmFailed`, `sale.statusConfirmed`, `sale.statusWaiting`, `sale.filterAll`, `sale.confirmedOn`, `sale.confirmedOnNoUser`, `sale.waiting`, `closeDay.breakdownSales`, `closeDay.breakdownSalesPending`, `closeDay.pendingSalesWarning`, `closeDay.kind.SALE_CONFIRMED`. Check the existing `sales.*` / `sale.*` group names first and put the keys in the group that already holds sale texts; reuse `common.*` where it exists.

## Before you finish

`cd client && npm run lint && npm run build`. Both green. List the files you touched.
