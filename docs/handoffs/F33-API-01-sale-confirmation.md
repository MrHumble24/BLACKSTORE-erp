# F33 — Sale confirmation at the daily close: API contract

Feature: F33 (change request from the client on F13 / F30 / F32). Every sale must be **confirmed by the Admin on the close-day page** before its money counts in the drawer, the same gate as walk-in payouts (F32). Partner-reported sales (consignment) are sales too and follow the same rule.
Covers: F13 (drawer math), F30 (breakdown, events), F32 (the pattern), FR-19–FR-22 (sales and payments, unchanged business meaning), BR-6/BR-8 (profit and debt unchanged), FR-30 (audit).
Permissions: confirming / undoing needs `close_day` (Admin + SuperAdmin). Selling and recording payments stay as they are.

## Decision model

- `Sale` gains `confirmedAt DateTime?` and `confirmedById Int?` (User). `null` = not yet confirmed.
- **Nothing else about a sale changes**: status PAID/DEBT, customer debt (BR-8), profit (BR-6), receipts and stock are exactly as today. Confirmation is a drawer gate only.
- **Drawer math**: a sale payment (cash or card) counts in the day window at its **effective time** = `max(payment.createdAt, sale.confirmedAt)`; payments of an unconfirmed sale never count. So a sale confirmed at the close counts that day; a payment recorded later on an already-confirmed sale counts on its own day; a sale confirmed days later lands in the day of confirmation (frozen snapshots stay untouched, F13).
- **Refunds** follow the same rule: a return's `cashRefund` counts at `max(return.createdAt, sale.confirmedAt)` and never while the sale is unconfirmed (a refund only gives back money that was counted). So `pendingSalesCash` = cash paid − cash refunded on unconfirmed sales, and a sale sold and fully refunded before confirmation nets to zero everywhere.
- **Existing sales** are migrated to `confirmedAt = createdAt`, `confirmedById = null`.
- **Undo** only while `confirmedAt >= openDay.openedAt` (409 otherwise). Confirm, confirm-many and undo lock the OPEN day row (`FOR UPDATE`, retry once, as F32) so they can never race the close. Each action writes one `AuditLog` row per sale (`action: 'update'`, entity `Sale`, before/after `{ confirmedAt, confirmedById }`).

## Types

```ts
// SaleSummary and Sale gain:
confirmedAt: string | null;
confirmedBy: { id: number; name: string } | null;
canUndo: boolean;              // confirmed and still inside the OPEN day

// GET /business-day/current changes:
breakdown: { paymentsCash; paymentsCard; cashIncome; cashExpense; cashRefunds; walkInPurchases; pendingWalkInPurchases;
  pendingSalesCash: string;    // NEW: Σ cash payments of unconfirmed sales, any day; shown, never counted
  pendingSalesCard: string;    // NEW: same for card
};
sales: OpenDaySaleRow[];       // today's sales as before, each row gains confirmedAt, confirmedBy
pendingSales: OpenDaySaleRow[]; // NEW: every unconfirmed sale, any day, oldest first, capped at 200, with paidCash, paidCard (net of cash refunds, decimal strings) and party (customer or partner name)
pendingSalesCount: number;     // NEW: total number of unconfirmed sales (may exceed the 200 rows)
type DayEventKind = ... | 'SALE_CONFIRMED';
// PAYMENT event: cash/card effect only when the sale is confirmed AND payment.createdAt >= confirmedAt; otherwise null
// RETURN event: cash effect only when the sale is confirmed AND return.createdAt >= confirmedAt; otherwise null
// SALE_CONFIRMED (NEW): time = confirmedAt, cash = "+(Σ cash payments − Σ cashRefund) made before confirmation", card likewise, user = confirmedBy, title "#id", subtitle customer or partner name; null when zero
```

## Endpoints

| Method | Path | Permission | Request | Response |
| --- | --- | --- | --- | --- |
| PATCH | `/sales/confirm` | `close_day` | `{ ids: number[] }` (1–200, distinct) | `{ confirmed: number }`; already-confirmed ids are skipped, unknown ids → 404 for the batch |
| PATCH | `/sales/:id/confirm` | `close_day` | empty | `SaleSummary`; 404 unknown, 409 already confirmed |
| PATCH | `/sales/:id/unconfirm` | `close_day` | empty | `SaleSummary`; 404, 409 when not confirmed or `confirmedAt` is before the OPEN day's `openedAt` |
| GET | `/sales`, `/sales/:id` | unchanged | optional query `confirmed=true\|false` on the list | add the three fields above |
| GET | `/business-day/current` | unchanged | | breakdown, `pendingSales`, events as above |

Declare `PATCH /sales/confirm` **before** `PATCH /sales/:id/...` routes so "confirm" is not parsed as an id.

## Client

- **Close-day, Current tab**: a new **"Sales waiting for confirmation"** tile above the review tiles: every unconfirmed sale (any day) with date, `#id`, seller, customer/partner, cash and card amounts, a **Confirm** button per row and a **Confirm all** button in the header (bulk endpoint; it confirms the listed rows, so its label carries the count, e.g. "Confirm all (37)"). The warning on the close bar uses `pendingSalesCount`. The existing Sales tile keeps today's sales and shows a "Confirmed" tick or "Waiting" badge per row. Breakdown shows "Cash sales" (confirmed only) and a muted "Sales waiting (not counted)" line with cash and card. The feed shows `SALE_CONFIRMED` as money-in and `PAYMENT` without effect until confirmed.
- **Sale detail** (`/sales/:id`): a status line "Confirmed on {{date}} by {{name}}" / "Waiting for confirmation", with **Confirm** and **Undo** (while allowed) for `close_day` users.
- **Sales list**: a small status badge per row and a filter All / Waiting / Confirmed.

## Owner questions (defaults chosen)

- Should the close be **blocked** while sales are still waiting? Default: **no**, the close bar shows a warning count instead ("{{n}} sales not confirmed"); the Admin decides.
- Should payments recorded later on an already-confirmed debt sale also need confirmation? Default: **no**, they count on their own day (they are already visible as PAYMENT events).
- "The same way they purchase from … other stores": does this also mean supplier / batch purchases need confirmation? Default: **no** (supplier payments are bank transfers with no drawer effect, F30); only sales are gated here.
- Debt sales with no payment yet also sit in the waiting list until confirmed ("each sale").

## Follow-up (not in this feature)

- iOS: confirmation status on the sale screen and the close screen. Separate UI handoff.
