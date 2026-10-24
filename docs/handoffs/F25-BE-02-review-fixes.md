Working tree: main repo. Follow `CLAUDE.md`, `docs/rules/backend.md`, `docs/rules/frontend.md`. Do not commit.
The tree also holds unrelated uncommitted changes from another session (items page, dashboard):
do not touch them.

# F25-BE-02 — Investor money trail: review fixes (backend + frontend)

Fixes from the code and security reviews of F25 (commit 42672d1).

## Frontend (client/)

1. **Stale investor page after a supplier payment** (`entities/supplier/api/index.ts:112-113`
   only refreshes the supplier). In `features/manage-suppliers/ui/SupplierPaymentContent.tsx`
   (a feature may import both entities), on success also invalidate `investorKeys.all` when an
   `investorId` was sent, so the investor's money cards and "Sent to suppliers" table refresh.
2. `pages/investors/ui/InfoCard.tsx:12`: join classes with `cn()` from `@/shared/lib` (twMerge) so
   the `font-bold` passed by `InvestorMoneyCards` actually overrides the base `font-semibold`.

Done when `npm run build`, `npm run lint`, `node scripts/check-i18n.mjs` pass in `client/`.

## Backend (server/)

3. `investors.service.ts:~160`: the deposits/payouts `groupBy` is awaited before the `Promise.all`;
   run it inside the same `Promise.all` so the money block is one round of parallel queries.
4. `investors.service.ts`: revert the `_sum` → `sum` rename in `depositsAndPayouts` (noise only).
5. `supplier-payments.service.ts:42` `findAllForInvestor`: 404 `'Investor not found'` for an unknown
   id, like `findAll` does for suppliers (one `count`). Spec case.
6. `supplier-payments.service.ts:117-140`: one `baseRow(p)` shared by `toResponse` and
   `toInvestorRow`; each adds only its relation.
7. Security (LOW): a correcting entry's negative fee has no bound, so `feesCharged` could be pushed
   below zero. In `parseAmounts`, when the fee is negative require `|fee| ≤ |amount|`
   (400 `'A fee correction cannot exceed the corrected amount'`). Spec case. Mirror the rule in the
   client schema (`suppliers.validation.feeCorrectionTooLarge`, uz/ru/en) so the user sees it before
   submitting.

Done when `npm run build`, `npm run lint`, `npm test` pass in `server/`.
