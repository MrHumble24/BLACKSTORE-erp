Working tree: main repo. Backend (`server/`) first, then the frontend (`client/`) of the same
feature; they are disjoint and may share the tree. Follow `CLAUDE.md`, `docs/rules/backend.md`,
`docs/rules/frontend.md`. Do not commit.

# F25 — Investor money trail: supplier payments per investor, fee payer, unsold stock (backend + frontend)

## Why

The shop sends investors' money abroad to the suppliers in Dubai and Hong Kong, and the suppliers
send devices owned by those investors. Today the three records exist but are not tied together:

- a supplier payment is not linked to an investor, so "this $20,000 sent to Dubai was Investor A's
  money" cannot be shown;
- the transfer fee belongs to nobody: whether the investor or the business pays it is not recorded;
- the investor's running total is deposits − payouts only; money already sent abroad for them and
  the value of their unsold devices are not shown against it.

PRD: FR-10 (investor money: money put in and paid back, running total), FR-17 (supplier balance and
transfer fee), FR-8 (owner per item), BR-8 (balances are calculated, never typed in), G3 (nobody
forgets who owes money). Admin-only everywhere (`manage_suppliers`, `manage_investors`); staff never
see cost (FR-29).

## Backend (F25-BE-01)

### Schema (one migration `…_supplier_payment_investor`)

```prisma
enum FeePayer { BUSINESS INVESTOR }

model SupplierPayment {
  …
  investorId Int?      // whose money was sent; null = the business's own money
  investor   Investor? @relation(fields: [investorId], references: [id])
  feePaidBy  FeePayer  @default(BUSINESS) // who bears `fee`; INVESTOR only allowed when investorId is set
}
model Investor { … supplierPayments SupplierPayment[] }
```

Existing rows keep `investorId = null`, `feePaidBy = BUSINESS` (the business's money, as before).

### `POST /suppliers/:id/payments` (`manage_suppliers`, unchanged route)

`CreatePaymentDto` gains `investorId?: number` (`@IsInt() @IsPositive()`) and
`feePaidBy?: 'BUSINESS' | 'INVESTOR'` (`@IsEnum(FeePayer)`). Service checks, in order, before the
transaction: `feePaidBy === 'INVESTOR'` without `investorId` → 400 (no DB call, so first); investor
exists → 404 `'Investor not found'`; `isOwn === true` → 400 `'Use no investor for the business's own
money'`; `!isActive` → 400 `'Inactive investor'`. Response (`toResponse`) adds
`investor: { id, name } | null` and `feePaidBy`. `GET /suppliers/:id/payments` lists include the
same two fields (one `include: { investor: { select: { id, name } } }`, no N+1). Audit `after`
already stores the whole row.

**Corrections.** A correcting entry (negative amount) for an investor payment carries the same
`investorId` and `feePaidBy`; nothing enforces it (append-only ledger), say so in the DTO comment.
`fee` becomes a **signed** decimal string, but a negative fee is accepted only when `amount` is
negative too (400 `'A negative fee is only allowed on a correcting entry'`), so a wrong fee or a wrong
fee payer can be reversed. Supplier balance ignores fees as today.

**The fee never touches item cost or profit share.** BR-1 defines cost as purchase price plus the
FR-18 extra costs; an investor-paid fee is a deduction from the investor's money only, a
business-paid fee is simply money out (it is not yet an expense in net profit, pre-existing gap).
Comment this on the DTO so nobody "fixes" it. UI hint: do not also put the transfer fee into the
batch's extra costs, or the investor pays it twice.

### Investor money summary

`GET /investors/:id` (detail, `manage_investors`) adds a `money` block next to `balance`
(`balance` keeps its meaning: deposits − payouts, so nothing else changes). The block is returned
**only when the actor also has `view_cost`** (pass `actor` into `findOne` as `SuppliersService.findOne`
does; cost is gated by `view_cost` everywhere, FR-29) and **never for the OWN investor** (business
items carry the OWN id but business payments carry `null`, so its figures would not reconcile):

```ts
money: {
  deposits: string;        // Σ DEPOSIT
  payouts: string;         // Σ PAYOUT
  sentToSuppliers: string; // Σ SupplierPayment.amount where investorId = id (signed, corrections included)
  feesCharged: string;     // Σ SupplierPayment.fee where investorId = id AND feePaidBy = INVESTOR (signed)
  unsentDeposits: string;  // deposits − payouts − sentToSuppliers − feesCharged: money put in that has not gone abroad yet
  unsoldItems: number;     // items with investorId = id and status IN_STOCK | AT_PARTNER
  unsoldAtCost: string;    // Σ (purchasePrice + extraCost) of those items: the same cost the profit report books per item
  defectiveItems: number;  // status DEFECTIVE, count only: their cost was already booked as a loss by the return (BR-6)
}
```

Not "cash held": what the shop holds for an investor would also include sale money (cost returned
plus the investor's share), which the PRD does not define; `unsentDeposits` is the honest name for
this formula. All decimal strings with 2 places. Compute in `InvestorsService.withBalance` (rename
to `withMoney`) with the queries run together in `Promise.all`: the existing
`investorTransaction.groupBy`, two `supplierPayment.aggregate` (amount; fee where feePaidBy
INVESTOR), `item.aggregate({ _count, _sum: { purchasePrice, extraCost } })` over the two statuses
and `item.count` for DEFECTIVE, exactly like `DashboardService` does for stock value (no per-item
helper exists; cost is the two columns). `create`/`update` call the same helper. Lists (`findAll`)
unchanged: no money fields.

### `GET /investors/:id/supplier-payments` (`manage_investors`, new)

Paginated (`PaginationQueryDto`), newest first, rows
`{ id, date, amount, fee, feePaidBy, note, supplier: { id, name } }`. One `findMany` with
`include: { supplier: { select: { id, name } } }` + `count`, same shape as
`SupplierPaymentsService.findAll`. Put it in `SupplierPaymentsService.findAllForInvestor` and
expose it from `InvestorsController` (`InvestorsModule` imports `SuppliersModule`, which today
exports nothing: add `exports: [SupplierPaymentsService]`; `SuppliersModule` imports no modules, so
no cycle; say so in the module comment). Permission `manage_investors` only: the rows are money
sent, not cost, and Admin holds both permissions anyway; note the deliberate difference from the
supplier route's `manage_suppliers`.

### Tests

`supplier-payments.service.spec`: investor stored; fee-payer 400 / 404 / isOwn 400 / inactive 400;
negative fee on a positive amount → 400, on a correction → stored; `findAllForInvestor` filters by
investor and includes the supplier name.
`investors.service.spec`: the `money` block arithmetic with deposits, payouts, supplier payments
(one fee charged to the investor, one to the business, one negative correction), items in every
status (only IN_STOCK and AT_PARTNER are summed, DEFECTIVE only counted); investor with nothing →
all zeros; no `money` without `view_cost`; no `money` for the OWN investor.

## Frontend (F25-FE-01, after the backend lands)

### Entities

- `entities/supplier`: `SupplierPayment` gains `investor: { id: number; name: string } | null` and
  `feePaidBy: 'BUSINESS' | 'INVESTOR'`; `CreateSupplierPaymentPayload` gains `investorId?: number`,
  `feePaidBy?: FeePayer`.
- `entities/investor`: `Investor.money?: InvestorMoney` (detail only, absent without `view_cost`
  and for the OWN investor) with the eight fields;
  `useInvestorSupplierPayments(id, page, pageSize)` → `GET /investors/:id/supplier-payments`;
  type `InvestorSupplierPayment`.

### Supplier payment dialog (`features/manage-suppliers`)

- `SupplierPaymentFields` lives inside `ui/SupplierFormFields.tsx` (100 lines) and takes only
  `register/errors/disabled`. Add a new file `ui/SupplierPaymentOwnerFields.tsx` with two controlled
  `SelectField`s (`value`/`onValueChange`, so it needs `control` + `setValue` from the form, passed
  from `SupplierPaymentContent.tsx`):
  **"Whose money"** (`suppliers.paymentInvestor`): first option `suppliers.paymentInvestorBusiness`
  ("Business (own money)", value `''`), then the active investors from `useInvestors()` excluding
  `isOwn`; default business. **"Commission paid by"** (`suppliers.feePaidBy`,
  `suppliers.feePaidByBusiness` / `suppliers.feePaidByInvestor`, default business) shown only when
  an investor is selected; read the investor field with `useWatch({ control })` (project rule, never
  `watch()`). Hint under it: `suppliers.feePaidByHint` ("Do not add the transfer fee to the batch's
  extra costs as well, or the investor pays it twice.").
- `model/supplier.schema.ts`: `investorId: z.string()` (`''` = none), `feePaidBy: z.enum(['BUSINESS','INVESTOR'])`;
  `SupplierPaymentContent.tsx` default values and submit mapping extended: `''` → omit, otherwise
  `Number(investorId)`; `feePaidBy` only when an investor is set. Fee may be negative only when the
  amount is negative (same rule as the server; `suppliers.validation.feeNegativeOnlyOnCorrection`).
- Every component stays ≤ 50 lines.

### Supplier page

`SupplierPaymentsTable`: new column `suppliers.paymentInvestor` showing the investor name or
`suppliers.paymentInvestorBusiness`; when `feePaidBy === 'INVESTOR'` show the fee with a small
`suppliers.feePaidByInvestorShort` ("inv.") suffix so the owner sees who bore it. `colSpan` 4 → 5.

### Investor page (`pages/investors/ui/InvestorDetailPage.tsx`, already 236 lines: new pieces go in new files)

- Move the private `InfoCard` out of `InvestorDetailPage.tsx` into `ui/InfoCard.tsx` so two files
  can use it. `InvestorMoneyCards.tsx`: a second row of `InfoCard`s from `investor.money`: Deposits,
  Paid out, Sent to suppliers, Commissions charged, **Not yet sent** (`unsentDeposits`, bold;
  negative shown in `text-launch-orange`), Unsold stock (`"<n> devices · <cost>"`), Defective
  (`"<n> devices"`). Labels `investors.money.*`. Rendered only when `investor.money` exists (so
  nothing for staff-like roles, nothing for the OWN investor). Keep the existing Balance card.
- `InvestorSupplierPaymentsTable.tsx` below the transactions table, titled
  `investors.supplierPaymentsTitle` ("Sent to suppliers"), columns Date · Supplier (link to
  `/suppliers/:id`) · Amount · Commission (with the "inv." suffix when charged to the investor) ·
  Note; `TablePagination` like the transactions table; empty state `investors.noSupplierPayments`.

### Translations

`suppliers.paymentInvestor|paymentInvestorBusiness|feePaidBy|feePaidByBusiness|feePaidByInvestor|feePaidByInvestorShort|feePaidByHint`,
`suppliers.validation.feeNegativeOnlyOnCorrection`,
`investors.money.deposits|payouts|sentToSuppliers|feesCharged|unsentDeposits|unsoldStock|unsoldValue|defective` (`{{count}}`, `{{cost}}`),
`investors.supplierPaymentsTitle|noSupplierPayments|supplier`, in uz/ru/en, identical keys.

### Edge cases

- Business investor (`isOwn`): the select never offers it; the server refuses it; its detail page
  shows no money block (business payments carry `investorId = null`, business items carry the OWN
  id, so the figures would not reconcile).
- Deactivated investor: not offered in the select; old payments still show on their page.
- Correction entries: negative amounts flow through all sums unchanged.
- `unsentDeposits` can be negative (the shop sent more than the investor put in). Show it, do not clamp.
- Items returned to stock after a sale count as unsold again; sold/debt items never do; defective
  items are counted but never valued (their cost was already a loss at return time).
- Staff never reach any of this (both pages and all routes are admin-only); `unsoldAtCost` is cost
  and must stay behind `manage_investors`.

## Done when

- `server/`: `npm run build`, `npm run lint`, `npm test` pass; migration applied locally.
- `client/`: `npm run build`, `npm run lint`, `node scripts/check-i18n.mjs` pass; files ≤ 300 lines,
  components ≤ 50.
- Browser: add a supplier payment for Investor A with commission paid by the investor → the supplier
  table shows A and the "inv." mark; A's page shows Sent to suppliers and Commissions charged, Not
  yet sent = deposits − payouts − sent − commissions, Unsold stock matching A's in-stock and
  at-partner devices, and the payment in the "Sent to suppliers" table with a link to the supplier;
  a payment with no investor changes nothing on any investor page; the OWN investor page shows no
  money block.

## For the owner (not for the developers)

Open definitions the PRD does not settle; the handoff takes the conservative reading:
1. "Money the shop holds for an investor" is shown only as deposits not yet sent abroad. Including
   sale money (cost returned plus the investor's share) is a bigger calculation; say if you want it.
2. Defective devices are counted but not valued, matching the profit report, which already books
   their cost as a loss when they come back.
3. A business-paid transfer fee is still not an expense in net profit (pre-existing gap).
