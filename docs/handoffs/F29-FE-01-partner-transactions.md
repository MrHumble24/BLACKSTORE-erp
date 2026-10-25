# F29-FE-01 — Partners page tabs, transactions feed, optional phone (frontend)

Work in the main tree, `client/` only. Follow the rules in CLAUDE.md / GEMINI.md / AGENTS.md and `docs/rules/frontend.md` (FSD, TanStack Query hooks, shadcn/ui, Tailwind, i18n in uz/ru/en with identical keys, ≤300 lines per file, ≤50 per function, `useWatch` never `watch()`).
Contract: `docs/handoffs/F29-API-01-partner-transactions.md` (read it first). PRD items: FR-26, W4, BR-8. Page: `/partners`.
Do not touch `client/src/features/sell/**` (unrelated work in progress). The locale files may have uncommitted changes; add your keys, revert nothing.

## Build

1. **Tabs component**: `npx shadcn@latest add tabs` into `shared/ui` (adds `@radix-ui/react-tabs`; allowed because the kit has no tabs and the rules name shadcn/ui as the UI kit). Export `Tabs, TabsList, TabsTrigger, TabsContent` from `shared/ui/index.ts`. Style the list like the existing pill selects (`rounded-full`, `h-8`, `text-xs`).
2. **`entities/partner`**
   - `model/types.ts`: `Partner.phone: string | null`; `CreatePartnerPayload.phone?: string`; `UpdatePartnerPayload.phone?: string | null`; add `PartnerTransactionKind`, `PartnerTransaction`, `PartnerTransactionsPage`, `PartnerTransactionsFilters = { from: string; to: string }` (full ISO timestamps) exactly as in the contract (five kinds including `REFUND`; totals include `refunded`).
   - `api/index.ts`: `partnerKeys.transactions(filters, page)`; `PARTNER_TRANSACTIONS_PAGE_SIZE = 20`; `usePartnerTransactions(filters, page)` → `GET /partners/transactions`. Comment what it does. Export from the slice `index.ts`.
3. **Optional phone**: `features/manage-partners`: the phone `TextField` loses `required`; the submit guard in `PartnerFormDialog.tsx:51` no longer blocks on an empty phone; send `phone` only when non-empty on create, and `phone: null` on edit when cleared. Show the "(optional)" hint the way other optional fields in the app do (search `common.optional` or similar; add `partners.phoneOptional` only if nothing exists). `pages/partners`: `PartnersTable`, `PartnerDetailPage` header and `PartnerContactCard` render `—` (or hide the line) when `phone` is null.
4. **`widgets/partner-transactions`** (new): `PartnerTransactionsPanel`.
   - `model/period.ts`: `type Period = 'today' | 'week' | 'custom'`; `rangeFor(period, custom)` returns `{ from, to }` as **ISO timestamps of the browser's local day boundaries**: `from` = local 00:00:00.000 of the first day, `to` = local 23:59:59.999 of the last day, both via `toISOString()`. today = today/today; week = Monday of the current week → today; custom = the two `YYYY-MM-DD` inputs (when only one is set, use it for both). Pure function, no date library. This is what makes "today" the user's day rather than the server's.
   - `ui/PeriodPicker.tsx`: three pill buttons (Today / This week / Custom) + `DateRangeInputs` from `shared/ui` shown only for Custom. Default: Today.
   - `ui/TransactionsTotals.tsx`: five small cards (handed over, sold, returned, paid, refunded) in `grid-cols-2 md:grid-cols-5`, same card classes as `pages/expenses/ui/ExpensesTotals.tsx` (copy the classes, do not import from pages).
   - `ui/TransactionsTable.tsx` + `ui/TransactionRow.tsx`: columns date+time (`formatDateTime` from `shared/lib`), kind as a `Badge` with one colour per kind, partner (link to `/partners/:id`), item or `× count` for handovers, user, amount (`formatMoney`) with the method shown for payments, and a link to `/sales/:id` when `saleId` is set. Loading and empty states, `TablePagination`. Keep each file ≤ 150 lines.
   - `ui/PartnerTransactionsPanel.tsx`: owns `period`, `custom`, `page` state; resets page to 1 on any filter change; renders picker, totals, table, pagination. Public `index.ts`.
5. **`pages/partners/ui/PartnersPage.tsx`**: keep `PartnersHeader` on top; below it `Tabs` with `partners.tabCurrent` (the existing search + table + pagination, moved into a small `CurrentPartnersTab` component in the same folder if the page would pass ~120 lines) and `partners.tabTransactions` (`<PartnerTransactionsPanel />`). Tab state in `useState`, default Current.
6. **i18n**: identical keys in `uz.json`, `ru.json`, `en.json` under `partners.`: `tabCurrent` ("Current"), `tabTransactions` ("Transactions"), `periodToday`, `periodWeek` ("This week"), `periodCustom`, `kindHandover` ("Handed over"), `kindSold` ("Sold"), `kindReturned` ("Returned"), `kindPayment` ("Payment"), `kindRefund` ("Refund"), `totalHandedOver`, `totalSold`, `totalReturned`, `totalPaid`, `totalRefunded`, `txItem` ("Item"), `txUser` ("By"), `noTransactions`. Reuse existing `common.*` / `ledger.*` keys for date, amount, loading. Uzbek and Russian wording in the same register as the existing `partners.*` keys.
7. No other new dependencies.

## Before you finish

`cd client && npm run lint && npm run build`. Both green. List the files you touched and the new dependency version.
