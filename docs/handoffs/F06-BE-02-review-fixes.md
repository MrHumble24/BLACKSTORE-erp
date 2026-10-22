You are the backend-developer agent of the BLACKSTORE project (Opus). **Work in the worktree `/Users/abdulboriymalikov/projects/BLACKSTORE/.worktrees/F06-BE-01` (branch `task/F06-BE-01`), ONLY in its `server/` folder.** Follow `CLAUDE.md` and `docs/rules/backend.md`. Use `pnpm`. Do not commit.

# F06 backend: review fixes
The three reviews of `F06-BE-01-operations.md` passed the PRD check. Fix the items below, smallest change that works.

## Security (fix first)
1. `src/transfers/transfers.service.ts` ~98-109: the device move is check-then-write. Put the precondition in the write and check the count:
   `const { count } = await tx.item.updateMany({ where: { id: { in: itemIds }, status: 'IN_STOCK', locationId: fromLocationId }, data: { locationId: toLocationId } }); if (count !== itemIds.length) throw new ConflictException('An item changed while transferring');`
   Keep the earlier `findMany` only for the "first item not in stock" message.
2. `src/transfers/transfers.service.ts` ~125-130: the accessory decrement has the same race. Replace `findUnique` + `decrement` with one conditional `updateMany({ where: { productModelId, locationId: fromLocationId, quantity: { gte: line.quantity } }, data: { quantity: { decrement: line.quantity } } })`; `count === 0` → `BadRequestException` naming the model. You still need the source `avgCost` for the target blend: read it in the same transaction before the update.

## Code
3. `src/transfers/transfers.service.ts` ~83-93: reject duplicate `productModelId` in `accessories` with 400 (same `Set` check as `itemIds`).
4. `src/ledger/ledger.service.ts` ~43: order `[{ date: 'desc' }, { id: 'desc' }]` (entries can be backdated).
5. `src/stock-counts/stock-count-result.ts` ~23-28: add the tag `// ponytail: scan status is not stored (no column); derived on each read, so a finished count can drift. Add a status column if history must be frozen.`
6. `src/accessory-stock/accessory-stock.service.ts` ~136-142: delete the private `assertActiveLocation`; import the shared one from `../items/item-queries`.
7. `src/transfers/transfers.service.ts` ~113-118: replace the promise-reduce chain with `for (const line of lines) await this.moveOneAccessory(...)`.
8. `src/transfers/transfer-shape.ts` ~37-64: one helper for the 7 shared summary fields, spread into both mappers.
9. `test/app.e2e-spec.ts` is 515 lines: move the F06 blocks into a new `test/operations.e2e-spec.ts` so `app.e2e-spec.ts` goes back to what it was. Keep the app bootstrap and login inline in the new file (a copy is fine for now; the F05 session is making `test/e2e-setup.ts` in main and the merge will switch to it). Do not create a helper file.
10. Unit test for 1, 2 and 3 (count mismatch → 409, insufficient quantity → 400, duplicate model → 400).

## Before you finish
- `pnpm build`, `pnpm lint`, `pnpm test`, `pnpm test:e2e` (against `blackstore_f06`) pass.
- Report in under 15 lines: what changed per item, anything skipped.
