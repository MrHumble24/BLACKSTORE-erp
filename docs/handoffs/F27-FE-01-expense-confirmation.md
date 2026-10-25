# F27-FE-01 — Expense confirmation (frontend)

Work in the main tree, `client/` only. Follow the rules in CLAUDE.md / GEMINI.md / AGENTS.md and `docs/rules/frontend.md` (FSD, TanStack Query hooks, shadcn/ui, Tailwind, i18n in uz/ru/en, ≤300 lines per file, ≤50 per function).
Contract: `docs/handoffs/F27-API-01-expense-confirmation.md` (read it first). PRD items: FR-27, BR-5. Page: `/expenses`.

## State when you start

A previous run already changed these files; it was interrupted before lint/build. Read them first, finish what is missing, fix what is wrong, do not rewrite from scratch:
`client/src/entities/ledger/api/index.ts`, `client/src/entities/ledger/model/types.ts`, `client/src/pages/expenses/ui/{ExpensesFilters,ExpensesTable,ExpensesTotals,ExpenseStatusCell}.tsx`, `client/src/shared/i18n/locales/{uz,ru,en}.json`.
Do not touch `client/src/features/sell/` (unrelated work in progress).

## Build

1. **`entities/ledger`**
   - `model/types.ts`: `export type ExpenseStatus = 'PENDING' | 'CONFIRMED' | 'EXCLUDED'`; `LedgerEntry.status: ExpenseStatus`; `LedgerFilters.status?: ExpenseStatus`; `LedgerPage.totals` = `{ income, expense, pendingExpense, excludedExpense, net }`.
   - `api/index.ts`: send `status` in the list query; add `useSetLedgerStatus()` mutation → `PATCH /ledger/:id/status` `{ status }`, on success invalidate the ledger queries **and** the profit report, dashboard and business-day query keys (find their `*Keys.all` in `entities/`), because the decision changes net profit and expected cash. Comment what it does.
2. **`pages/expenses`**
   - `ExpensesFilters.tsx`: add a status select (All / Waiting / Confirmed / Excluded), same style as the type select.
   - `ExpensesTotals.tsx`: cards: Income, Confirmed expenses (orange), Waiting (muted/amber), Excluded (muted), Net (blue). Grid `grid-cols-2 md:grid-cols-5`. Keep `TotalCard`.
   - `ExpensesTable.tsx`: the "in profit" column becomes a "Profit" column. INCOME rows: unchanged check/dash. EXPENSE rows: a status `Badge` (Waiting / Confirmed / Excluded) plus a compact shadcn `Select` or `DropdownMenu` to change it (three options). Use `useSetLedgerStatus`; disable while pending; show a toast on error using the existing toast helper. Split a `ExpenseStatusCell.tsx` if the file would pass 300 lines.
3. **i18n**: add identical keys to `client/src/shared/i18n/locales/{uz,ru,en}.json` under `ledger.`: `status`, `statusAll`, `statusPending`, `statusConfirmed`, `statusExcluded`, `totalPendingExpense`, `totalExcludedExpense`, `setStatus`, `statusUpdateFailed`. English: Waiting / Confirmed / Excluded. Uzbek: Kutilmoqda / Tasdiqlangan / Chiqarib tashlangan. Russian: Ожидает / Подтверждён / Исключён.
4. Use `useWatch` (never `watch()`) for any reactive form reads. No new dependencies.

## Before you finish

`cd client && npm run lint && npm run build`. Both green. List the files you touched.
