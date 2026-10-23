# F04-BE-03: Batch logic fixes (backend)

Worktree: `.worktrees/F04-BE-03` (branch `task/F04-BE-03`). Work only there. Database `blackstore_f04b` (already in that worktree's `server/.env`). Do not commit or merge; the allocator does.

Follow the rules in CLAUDE.md / GEMINI.md / AGENTS.md and `docs/rules/backend.md`. Read `docs/handoffs/F04-API-contract.md` (section "F04-BE-03 changes" at the end) before coding; build exactly that contract.

## Why

Batch 20 in the test database has 6 device lines but only 4 real phones. Two scans were glued by the scanner (`005363194336779002373484739940` = IMEI + IMEI, `002762483075225TSTTPQRUUD` = IMEI + serial). Each glued code was accepted as a new serial and created a ghost device. Stock and the supplier balance are wrong and nothing can remove the ghost lines. This task closes those gaps.

PRD: W1 (receive a batch), FR-14 (scanning), FR-16, FR-17 (supplier balance), FR-18 (extra costs), FR-29 (past records), BR-1, BR-7, BR-8.

## Tasks

### 1. Refuse glued scan codes

In `server/src/items/item-validation.ts` (`validateIdentifier`), for every identifier type:

- A value that starts with 15 digits and is longer than 15 characters → 400 `Code looks like two scans glued together; scan again`.
- A `SERIAL` longer than 20 characters → 400 `SERIAL must be 4–20 chars of A-Z, 0-9 and -`. `SYSTEM_CODE` keeps 4–40.

This covers `POST /items`, `POST /batches/:id/items`, `POST /items/:id/identifiers` and walk-in purchases because they all call `validateIdentifier`. Add unit tests for both rules.

### 2. Remove a batch line: `DELETE /batches/:id/lines/:lineId`

Permission `delete_records`. In one transaction:

- 404 if the line is not in this batch.
- Device line: the item must be `IN_STOCK` and must have no sale line, consignment item, transfer line or stock-count row. Otherwise 409 `Device #N was already sold, handed over or moved; it cannot be removed`. Then delete the item's identifiers, the item and the purchase line. Audit `delete` on `Item` (before = full item) and on `PurchaseLine`.
- Accessory line: the `AccessoryStock` row at the batch location must have `quantity >= line.quantity`, otherwise 409 `Only N units are left at <location>; the line cannot be removed`. Decrement the quantity, leave `avgCost` as it is (`ponytail:` comment: cost history is not unwound), delete the line. Audit both.
- After either case call `applyResplit(tx, batchId)`.
- Respond 204.

Check the Prisma relations on `Item` for the "no later records" test (SaleLine, ConsignmentItem, TransferLine or whatever the real names are; read `schema.prisma`). Use `_count` in one query, not four.

### 3. Lock old batches (FR-29)

Add `isPastBatch(batch): boolean` in `server/src/batches/batch-lock.ts`: true when `arrivalDate` is before the start of today minus `BATCH_EDIT_DAYS = 3` days (constant in that file, with a comment). Use `startOfToday` from `common/dates.ts`.

`POST /batches/:id/items`, `POST /batches/:id/accessories`, `PATCH /batches/:id`, `PATCH /batches/:id/lines/:lineId`, `PATCH /batches/:id/lines` and `DELETE /batches/:id/lines/:lineId` on a past batch need `edit_past_records`; otherwise 403 `This batch is older than 3 days; editing it requires the edit_past_records permission`. One helper `assertBatchEditable(batch, actor)` called from the services.

Add `isLocked: boolean` to `BatchSummary` and `Batch` (= `isPastBatch`). The client hides the edit controls from it.

### 4. Extra cost with split NONE

In `BatchesService.update`: compute the values after the update (new or current `extraCostTotal`, new or current `costSplitMethod`). If total > 0 and method is `NONE` → 400 `Choose how to split the extra cost (EQUAL or BY_PRICE) or set it to 0`. Unit test.

### 5. Price all lines of one model: `PATCH /batches/:id/lines`

Permission `manage_prices`. Body `{ productModelId: number; unitPrice: string }`. Reprice every line of the batch whose model (item's model for device lines, line's model for accessory lines) is `productModelId`, using the same per-line logic as `updateLine` (device → `Item.purchasePrice`; accessory → avgCost adjustment). 404 if the batch has no line of that model. One `applyResplit` at the end, not one per line. One audit row per changed line. Respond with the full `Batch`.

Refactor `updateLine` so both endpoints share one private `repriceLine(tx, line, newPrice, actor)`; no copy-paste.

### 6. Accessory reprice when some units are gone

In `adjustAvgCost`, the delta is spread over the units still in stock. When most are sold the average jumps. Change the formula to
`avgCost += (new − old) × min(line.quantity, stock.quantity) / stock.quantity`
so the change per remaining unit never exceeds `new − old`. Update the comment and the unit test.

### 7. Count unpriced lines

Add `unpricedLines: number` (lines with `unitPrice = 0`) to `BatchSummary` and `Batch`, only with `view_cost` like the other cost keys. Compute from the lines already loaded, no extra query.

## Done when

- `pnpm lint`, `pnpm test`, `pnpm test:e2e` pass in the worktree.
- New unit tests: glued code rules, split-NONE rule, avgCost cap, `isPastBatch`.
- e2e: remove a device line (happy path and 409 after sale), price all lines of a model, 403 on a past batch for Staff.
- The contract section in `docs/handoffs/F04-API-contract.md` matches what you built; update it if a detail had to change and say so in your report.
