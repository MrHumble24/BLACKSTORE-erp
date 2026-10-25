# F32-FE-01 — Walk-in payout confirmation (frontend)

Work in the main tree, `client/` only. Follow the rules in CLAUDE.md / GEMINI.md / AGENTS.md and `docs/rules/frontend.md` (FSD, TanStack Query hooks, shadcn/ui, Tailwind, i18n in uz/ru/en with identical keys, ≤300 lines per file, ≤50 per function, `useWatch` never `watch()`).
Contract: `docs/handoffs/F32-API-01-walk-in-payout.md` (read it first). PRD items: W5, FR-25, F13, F30. Pages: `/close-day` (Current tab) and `/items/:id`.
A parallel Gemini session polishes other UI files; do not touch `features/sell/**`, `features/consign/**`, `pages/accessories/**`, `pages/partners/**`. In `pages/items/**` and `entities/item/**` touch only the files named below. Locale files may have uncommitted changes; add keys, revert nothing.

## Build

1. **`entities/walk-in-purchase`** (new entity slice; `features/walk-in-purchase` already exists for the form, leave it): `model/types.ts` with `WalkInPayoutRow` from the contract; `api/index.ts` with `walkInPayoutKeys`, `usePendingWalkInPayouts(page)` → `GET /walk-in-purchases/pending`, `useMarkWalkInPaid()` → `PATCH /walk-in-purchases/:lineId/pay`, `useUndoWalkInPaid()` → `.../unpay`; both mutations invalidate `walkInPayoutKeys.all`, `businessDayKeys.all` and `itemKeys.all` (same cross-entity key pattern as `entities/ledger`). Public `index.ts`, short comments.
2. **`entities/item/model/types.ts`**: add optional `walkIn?: { lineId: number; sellerName: string; amount: string; paidAt: string | null; paidBy: { id: number; name: string } | null } | null` to `Item`.
3. **`entities/business-day/model/types.ts`**: `breakdown.pendingWalkInPurchases: string`; add `'WALK_IN_PAYOUT'` to `DayEventKind`.
4. **`features/confirm-walk-in-payout`** (new): `WalkInPayoutActions({ lineId, paidAt, canUndo })` — a **Paid** button (`close_day` permission via `useAuthStore`) when `paidAt` is null, otherwise the paid line text and an **Undo** button when `canUndo`; both call the hooks, disabled while pending, toast on error (`walkIn.payoutFailed`), success toast `walkIn.payoutConfirmed` / `walkIn.payoutUndone`. Public `index.ts`.
5. **Close-day, Current tab** (`pages/close-day/ui/`):
   - `ReconcileHero.tsx` breakdown: rename the walk-in line to `closeDay.breakdownWalkInPaid` ("Walk-in payouts") and add a muted line `closeDay.breakdownWalkInPending` ("Walk-in waiting (not subtracted)") from `breakdown.pendingWalkInPurchases`.
   - New `WalkInPayoutsTile.tsx`: a review-style card (same `CARD`, count chip, empty state `closeDay.noneToday` → use `walkIn.noPending`) listing `usePendingWalkInPayouts(1)` rows: date (`formatDate`), seller name, item model + identifier, amount (`money`), and `WalkInPayoutActions` with `canUndo={false}`. Render it in `CurrentDayTab.tsx` right under the events feed. Add `TablePagination` only if the page size (20) is exceeded (`total > 20`).
   - `DayEventRow.tsx` kind map: add `closeDay.kind.WALK_IN_PAYOUT` ("Walk-in payout"), money-out colour. `WALK_IN_PURCHASE` keeps its badge but now shows no drawer effect.
6. **Device panel** `pages/items/ui/`: new `ItemWalkInCard.tsx` rendered in `ItemDetailsPage.tsx` under the pricing card only when `item.walkIn` exists (so only `view_cost` viewers): title `walkIn.cardTitle` ("Walk-in purchase"), seller, amount, status line (`walkIn.paidOn` "Paid on {{date}} by {{name}}", or `walkIn.paidOnNoUser` "Paid on {{date}}" when `paidBy` is null (migrated rows) / `walkIn.waiting` "Waiting for payout"), and `WalkInPayoutActions` with `canUndo={Boolean(item.walkIn.paidAt)}` (the server returns 409 if the payout is already in a closed day; show that message via the error toast).
7. **i18n**: identical keys in `uz.json`, `ru.json`, `en.json`: `walkIn.cardTitle`, `walkIn.seller`, `walkIn.paidOn`, `walkIn.paidOnNoUser`, `walkIn.waiting`, `walkIn.markPaid` ("Paid"), `walkIn.undo` ("Undo"), `walkIn.payoutConfirmed`, `walkIn.payoutUndone`, `walkIn.payoutFailed`, `walkIn.pendingTitle` ("Walk-in payouts waiting"), `walkIn.noPending`, `closeDay.breakdownWalkInPaid`, `closeDay.breakdownWalkInPending`, `closeDay.kind.WALK_IN_PAYOUT`. Check whether a `walkIn.` group already exists (the purchase form has keys); add inside it if so.
8. No new dependencies.

## Before you finish

`cd client && npm run lint && npm run build`. Both green. List the files you touched.
