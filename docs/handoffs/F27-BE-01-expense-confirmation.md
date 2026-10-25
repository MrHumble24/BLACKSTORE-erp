# F27-BE-01 — Expense confirmation (backend)

Work in the main tree, `server/` only. Follow the rules in CLAUDE.md / GEMINI.md / AGENTS.md and `docs/rules/backend.md`.
Contract: `docs/handoffs/F27-API-01-expense-confirmation.md` (read it first). PRD items: FR-27, FR-28, BR-5, F13.

## Build

1. **Prisma**: `enum ExpenseStatus { PENDING CONFIRMED EXCLUDED }`; `LedgerEntry.status ExpenseStatus @default(PENDING)` with a comment; fix the `countsInProfit` comment on line 632 (it says "always false for EXPENSE"; keep it, but add that expense profit impact is now `status`). Migration (`server/prisma/migrations/<ts>_ledger_expense_status`) adds the column and sets existing rows to `CONFIRMED` (`UPDATE "LedgerEntry" SET status = 'CONFIRMED'`). Then `prisma generate`.
2. **`ledger.service.ts`**
   - `create`: `status` = `PENDING` for EXPENSE, `CONFIRMED` for INCOME. Add `status` to `entrySelect` and `toEntry`.
   - `findAll`: accept `status` filter. Totals: group by `type` and `status` (one `groupBy({ by: ['type','status'] })`), return `{ income, expense (CONFIRMED only), pendingExpense, excludedExpense, net = income − expense }`.
   - new `setStatus(id, status, actor)`: load row (404 if missing), 400 if `type === INCOME`, update in a `$transaction` with an audit log (`action: 'update'`, before/after). Return `toEntry`.
   - Keep the file ≤ 300 lines; split a `ledger-totals.ts` helper if needed.
3. **DTOs**: `QueryLedgerDto.status?: ExpenseStatus` (`@IsEnum`); new `dto/update-ledger-status.dto.ts` with `status: ExpenseStatus` (`@IsEnum`).
4. **Controller**: `@Patch(':id/status')` with `ParseIntPipe` → `ledger.setStatus`.
5. **Profit report** `reports/profit-report.service.ts` `ledgerTotals`: expense aggregate adds `status: ExpenseStatus.CONFIRMED`.
6. **Daily close** `business-day/business-day.reconcile.ts`: `cashExpense` also requires `status === CONFIRMED`; add `status` to the input type and to `ledgerSelect` in `business-day.service.ts`. Do **not** add it to `toLedgerRow` (the review screen does not show it).
7. **Tests**: extend `ledger.service.spec.ts` (create sets PENDING for EXPENSE and CONFIRMED for INCOME; setStatus 400 on INCOME; totals exclude PENDING/EXCLUDED) and `business-day.reconcile.spec.ts` (PENDING cash expense does not reduce expected cash). Update any report spec that breaks. **e2e**: `server/test/operations.e2e-spec.ts:217-229` expects a new 500 expense in `totals.expense`; change it to expect `pendingExpense`, then PATCH `/ledger/:id/status` to CONFIRMED and expect `expense`. That covers the new endpoint too.

## Before you finish

`cd server && npx prisma migrate dev --name ledger_expense_status && npm run lint && npm run build && npm test`. All green. Report the migration name and the final response shapes.
