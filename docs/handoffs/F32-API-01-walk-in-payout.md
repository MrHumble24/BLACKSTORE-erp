# F32 — Walk-in purchase payout confirmation: API contract

Feature: F32 (change request from the client on W5 / F30). The shop does not always pay the walk-in seller on the spot; the money may leave the drawer days later. So a walk-in purchase must **not** reduce expected cash automatically. The Admin confirms the payout, on the close-day page or on the device's panel, and only then does it count, **on the day it was confirmed**.
Covers: W5, FR-25, F13 (drawer math), F30 (events feed, breakdown), FR-30 (audit).
Permissions: confirming / undoing a payout needs `close_day` (Admin + SuperAdmin). Staff keep `buy_walk_in` to record the purchase. Amounts are purchase cost, so the device panel shows them only with `view_cost`.

## Decision model

- `PurchaseLine` (walk-in lines only) gains `paidAt DateTime?` and `paidById Int?` (User). `null` = payout not confirmed yet.
- **Drawer math (F13/F30)**: `expectedCash` subtracts walk-in lines whose `paidAt` falls in the day window (server-set at confirmation, immutable). Unconfirmed lines are never subtracted; their total is shown as "waiting" in the breakdown, like F27's pending expenses.
- **Existing walk-in lines** are migrated to `paidAt = createdAt`, `paidById = null` (they were already treated as paid).
- **Undo** is allowed only while the payout is still inside the OPEN day (`paidAt >= openDay.openedAt`); a payout that already landed in a closed day's frozen snapshot cannot be undone (409). Both actions write an `AuditLog` row with before/after.
- The device panel shows, for a walk-in device, the seller, the amount, and "Paid on <date> by <user>" ("Paid on <date>" when migrated without a user) or "Waiting" with a confirm button. It shows the latest walk-in line only; an older unpaid line of a device bought back twice appears in the close-day waiting list.
- Known side effect (unchanged from F30): an Admin editing the item's purchase price rewrites the walk-in line's amount, also after the payout is confirmed, within the open day. Closed days are frozen.
- Double close: `close()` locks the OPEN row **without** retry, so a second concurrent close gets 409; only `pay`/`unpay` retry once to land in the newly opened day.
- Race with the daily close: `pay`/`unpay` and `close()` lock the OPEN `BusinessDay` row in their transactions, so a payout can never fall between a close's snapshot and the next day's window, nor be undone after it was frozen.

## Types

```ts
type WalkInPayoutRow = {
  lineId: number;
  createdAt: string;                       // when the device was bought
  amount: string;                          // unitPrice × quantity, decimal string
  seller: { name: string; phone: string };
  item: { id: number; model: string; identifier: string | null } | null;
  paidAt: string | null;
  paidBy: { id: number; name: string } | null;
};

// GET /items/:id gains (only when the viewer has view_cost, else key absent):
walkIn: { lineId: number; sellerName: string; amount: string; paidAt: string | null; paidBy: { id: number; name: string } | null; canUndo: boolean } | null;  // canUndo = paid and still inside the OPEN day

// GET /business-day/current changes:
breakdown: { paymentsCash; cashIncome; cashExpense; cashRefunds;
  walkInPurchases: string;        // now = Σ walk-in payouts CONFIRMED in this window (paidAt)
  pendingWalkInPurchases: string; // NEW: Σ all unconfirmed walk-in lines, any day; shown, never subtracted
};
type DayEventKind = ... | 'WALK_IN_PURCHASE' | 'WALK_IN_PAYOUT' | ...;
// WALK_IN_PURCHASE: keyed on createdAt, cash: null (informational), subtitle = seller name
// WALK_IN_PAYOUT (NEW): keyed on paidAt, cash: "-<amount>", user = paidBy, refType null
```

## Endpoints

| Method | Path | Permission | Request | Response |
| --- | --- | --- | --- | --- |
| GET | `/walk-in-purchases/pending` | `close_day` | `page`, `pageSize` (shared pagination) | `Page<WalkInPayoutRow>` of unconfirmed walk-in lines, oldest first |
| PATCH | `/walk-in-purchases/:lineId/pay` | `close_day` | empty body | `WalkInPayoutRow` with `paidAt` = now, `paidBy` = actor. 404 unknown or not a walk-in line, 409 already paid |
| PATCH | `/walk-in-purchases/:lineId/unpay` | `close_day` | empty body | `WalkInPayoutRow` with `paidAt: null`. 404, 409 when not paid or when `paidAt` is before the OPEN day's `openedAt` |
| GET | `/items/:id` | unchanged | | adds `walkIn` for `view_cost` viewers |
| GET | `/business-day/current` | unchanged | | breakdown + events as above |

## Client

- **Close-day, Current tab**: breakdown gets "Walk-in payouts" (confirmed, subtracted) and "Walk-in waiting" (muted, not subtracted). A new review tile **"Walk-in payouts waiting"** lists every unconfirmed line (any day) with date, seller, item, amount and a **Paid** button; confirming refreshes the day. The events feed shows `WALK_IN_PURCHASE` with no drawer effect and `WALK_IN_PAYOUT` with the cash effect.
- **Device panel** (`/items/:id`), for a walk-in device and a `view_cost` viewer: seller, amount, status; **Paid** button (`close_day`), and **Undo** while the payout is in the open day.

## Follow-up (not in this feature)

- iOS: payout status on the device screen. Separate UI handoff.
