# F27 — Expense confirmation: API contract

Feature: F27 Expense confirmation (change request from the client on FR-27 / BR-5).
Covers: FR-27 (Admin records income and expenses), BR-5 (net profit = item profits − expenses + profit-counting income), FR-28 (profit report), F13 daily close.

## Decision model (agreed with the owner)

- Every **EXPENSE** starts as `PENDING` (waiting for the Admin).
- Admin marks it `CONFIRMED` (counts against profit) or `EXCLUDED` (does not count). Admin may change the decision later, any direction.
- Only `CONFIRMED` expenses are subtracted from net profit (BR-5) and from the expected cash of the daily close (F13). `PENDING` and `EXCLUDED` are shown in their own totals and never subtracted.
- Existing EXPENSE rows are migrated to `CONFIRMED` (they were already subtracted).
- `INCOME` rows are untouched: `countsInProfit` keeps its meaning. Their `status` is always `CONFIRMED` and is ignored.
- Roles: unchanged. Everything stays behind `manage_expenses` (Admin).

## Types

```ts
type ExpenseStatus = 'PENDING' | 'CONFIRMED' | 'EXCLUDED';

type LedgerEntry = {
  id: number; type: 'INCOME' | 'EXPENSE'; category: string; amount: string; date: string;
  note: string | null; countsInProfit: boolean; inCash: boolean;
  status: ExpenseStatus;                 // NEW. Meaningful for EXPENSE only
  user: { id: number; name: string };
};
```

## Endpoints (all `manage_expenses`)

| Method | Path | Change |
| --- | --- | --- |
| GET | `/ledger` | new optional query `status=PENDING\|CONFIRMED\|EXCLUDED`. `totals` becomes `{ income, expense, pendingExpense, excludedExpense, net }` where `expense` = CONFIRMED expenses only and `net = income − expense`. All decimal strings. |
| POST | `/ledger` | unchanged body. Server sets `status`: EXPENSE → `PENDING`, INCOME → `CONFIRMED`. |
| PATCH | `/ledger/:id/status` | **new**. Body `{ status: ExpenseStatus }`. Returns the updated `LedgerEntry`. 404 unknown id, 400 when the row is INCOME. Audit-logged with before/after. |

## Other consumers

- `reports/profit-report.service.ts` `ledgerTotals`: expenses where `status = CONFIRMED`.
- `business-day/business-day.reconcile.ts`: `cashExpense` sums only `inCash && type = EXPENSE && status = CONFIRMED` (owner's choice: undecided money is not expected gone from the drawer). The open-day review list of expenses is unchanged (no `status` there).

## Follow-up (not in this feature)

- iOS app (`mobile/`): add `status` to `Models/Ledger.swift`, show waiting/excluded totals in `LedgerView.swift`, label the expense total as confirmed. Separate UI-16 handoff.
