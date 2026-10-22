You are the backend-developer agent of the BLACKSTORE project (Opus). Work in the main tree `/Users/abdulboriymalikov/projects/BLACKSTORE`, ONLY in `server/`. Follow `CLAUDE.md` and `docs/rules/backend.md`. Use `pnpm`. Do not commit. Another session builds F06 in a worktree; in shared files only add or rename what is listed here.

# F05 backend: review fixes
The three reviews of `F05-BE-01-selling.md` found the items below. Fix them, smallest change that works.

## Security and correctness (fix first)
1. `src/items/items.service.ts` ~254-260 `changeStatus`: read-then-write with no guard, so two sales of the same device both succeed. Make the write conditional and check the count: `const r = await tx.item.updateMany({ where: { id, status: current }, data: { status: to } }); if (r.count === 0) throw new ConflictException('Item changed, try again');`. This fixes every caller at once.
2. `src/sales/sale-create.ts` ~93-96 + `sales.service.ts` ~107-115: accessory stock is checked, then decremented without a guard; two lines of the same model, or two concurrent sales, push `quantity` below zero. Reject duplicate `productModelId` lines with 400, and replace check + `decrement` with one atomic `updateMany({ where: { productModelId, locationId, quantity: { gte: qty } }, data: { quantity: { decrement: qty } } })`; `count === 0` → 400 naming the model.
3. `src/sales/sale-payments.service.ts` ~46-50: on the closing payment every line's item goes to SOLD, including returned ones (a returned shelf item becomes SOLD; a DEFECTIVE one throws and the debt can never be closed). Move only items whose current status is `DEBT`. Put this "close debt" item move in one function and also call it from `sale-returns.service.ts` ~52 when a return brings the balance to 0 and the sale becomes PAID (today those items stay DEBT forever).
4. `src/sales/sale-returns.service.ts` ~89: refund cap must be for the goods actually returned: `cap = unitPrice × (alreadyReturned + quantity) − refundedSoFar`, not the whole line.
5. `src/sales/sale-returns.service.ts` ~108-112: the stock row always exists, so use `update({ quantity: { increment } })` and delete the `upsert` create branch (it wrote the sale price as `avgCost`).

## Merge alignment with F06 (same names in both trees)
6. `src/items/item-queries.ts` ~76: rename `assertLocationActive` to `assertActiveLocation(tx, locationId): Promise<void>` with 404 when missing and 400 `Location is inactive`. Make `AccessoryStockService` use it and delete its private copy. Export one `assertAccessoryModel(tx, id)` in `item-queries.ts` and use it in `sale-create.ts` and `accessory-stock.service.ts`.
7. `src/common/dates.ts` ~43: `endOfDay(iso: string): Date` (throws `BadRequestException('Invalid date')` on NaN); callers do `to ? endOfDay(to) : undefined`. Extract one `parseIso(iso)` used by the three helpers.

## Code
8. `src/common/sequential.ts`: delete `forEachSequential` and `mapSequential`; use `for…of` + `await` in the callers.
9. `src/sales/sale-shape.ts` ~129-139: `toSale = { ...toSaleSummary(row), items, payments, returns }`.
10. `test/app.e2e-spec.ts` is 527 lines: move the app bootstrap and login into `test/e2e-setup.ts` (`createTestApp()`, `loginAs(app, username)`), the F05 flow into `test/sales.e2e-spec.ts`, and make `app.e2e-spec.ts` use the setup file. Every test file under 300 lines.
11. Unit tests for 1, 2, 3 and 4 (409 on a changed item, 400 on insufficient stock, returned items not re-sold, refund cap).

## Before you finish
- `pnpm build`, `pnpm lint`, `pnpm test`, `pnpm test:e2e` pass.
- Report in under 15 lines: what changed per item, anything skipped.
