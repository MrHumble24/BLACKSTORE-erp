You are the backend-developer agent of the BLACKSTORE project (Opus). **Work in the worktree `/Users/abdulboriymalikov/projects/BLACKSTORE/.worktrees/F07-BE-01` (branch `task/F07-BE-01`), ONLY in its `server/` folder.** Follow `CLAUDE.md` and `docs/rules/backend.md`. Use `pnpm`. Do not commit, do not merge.

# F07 part 1: review fixes
The PRD check passed. The code and security reviews found the items below. Fix them, smallest change that works.

## Security and correctness (fix first)
1. `src/consignments/consignments.service.ts` ~73 and ~129, `consignment-sell.service.ts` ~64: Staff can set a consignment `minPrice` below the item's own `minSalePrice` and sell at that price, bypassing FR-20. At handover and in `updateItemMinPrice`, reject `minPrice < item.minSalePrice` unless the actor has `manage_prices` (pass the actor, use the existing permission helper). Keep `canManagePrices = true` in the sell path (the floor is enforced where the price is set).
2. `src/reports/profit-lines.ts` ~64-68: the gate must be status only, `PAID` or `RETURNED`, as the contract says. Drop the extra "sum of payments ≥ total" check (a debt sale cleared by a refund still has real money received and its SALE + RETURN lines net correctly). Adjust the spec.
3. `src/reports/profit-report.service.ts` ~43-57 and `investor-report.service.ts` ~33-36: both load every PAID/RETURNED sale in history. One shared `loadReportSales(period, extraWhere)` with a SQL prefilter: `createdAt ≤ period.lte` and `OR: [{ createdAt ≥ period.gte }, { payments: { some: { date ≥ gte } } }, { returns: { some: { date ≥ gte } } }]`; keep the exact in-memory `profitDate` check. Fix the `ponytail:` note to say what is really held in memory.
4. `src/reports/profit-report.service.ts` ~24-34: sort lines by `profitDate` desc then `saleItemId` before slicing the page.
5. `src/consignment-sell.service.ts` ~46-49: also write an audit row `entity: 'Sale', action: 'create'` for the sale created in the same transaction (or put the sale snapshot in `after`).

## Code
6. `src/reports/investor-report.service.ts` ~48-62, ~92-111: reuse `groupLines` / `sumLines` from `profit-lines.ts` (add `cost` to the group accumulator) instead of re-implementing them.
7. `src/consignments/consignment-shape.ts` ~83-96: `toConsignment = { ...toConsignmentSummary(row), items }`. ~18-26: use `_count` for `itemCount` and a filtered `items: { where: { status: AT_PARTNER }, select: { id } }` for `heldCount`.
8. One `startOfToday()` in `common/dates.ts`; delete the copies in `consignment-shape.ts` and `partners.service.ts`.
9. `src/reports/reports.controller.ts` ~39: move the xlsx build into `InvestorReportService.xlsx(query, canViewCost)`; the controller only sets headers and returns the buffer.
10. `src/sales/sale-create.ts` ~50: error message names the expected status (`Item is not ${allowedStatus}`).
11. `prisma/schema.prisma`: add `@@index([partnerId])` on `Consignment` in the existing `partners` migration (edit the migration SQL and the schema; `npx prisma migrate reset` is fine on this worktree's database `blackstore_f07a`).
12. `src/partners/partners.service.ts`: one `zero()` helper for the empty report numbers. `update-partner.dto.ts`: allow `null` for `marketLocation` and `note` so they can be cleared.
13. `test/partners.e2e-spec.ts` ~144: query the profit report with `?from&to`.
14. Unit tests for 1 (below floor without `manage_prices` → 400, with it → ok) and 2.

## Before you finish
- `pnpm build`, `pnpm lint`, `pnpm test`, `pnpm test:e2e` (against `blackstore_f07a`) pass; `npx prisma validate`.
- No file over 300 lines, no function over 50.
- Report in under 15 lines: what changed per item, anything skipped.
