# F04-FE-03: Batch page logic fixes (frontend)

Worktree: `.worktrees/F04-FE-03` (branch `task/F04-FE-03`). Work only there, run `pnpm` from `.worktrees/F04-FE-03/client`. Do not commit or merge; the allocator does.

Follow the rules in CLAUDE.md / GEMINI.md / AGENTS.md and `docs/rules/frontend.md`. API: `docs/handoffs/F04-API-contract.md`, section "F04-BE-03 changes" at the end, plus `POST /items/:id/identifiers` from `F03-API-contract.md`. Parts marked **(needs BE)** depend on `F04-BE-03`; do the others first.

## Why

On `/batches/20` every scan creates a new phone. An iPhone box carries IMEI 1, IMEI 2 and a serial, so one phone became three. Glued scans created ghost devices too, and nothing on the page can remove them. Prices of 0 look normal. Extra cost can be saved with split "NONE" and then counts for nothing.

PRD: W1, FR-14, FR-18, FR-29, BR-1, BR-7.

## Tasks

### 1. Dual-SIM scanning (`features/receive-batch`, `BatchScanPanel`)

- Add a switch to the scan settings: `batches.dualSim` "Dual SIM: 2 IMEIs per phone". Off by default; remember it in the panel's local state only.
- When on: the first scan creates the device as today. The panel then shows a waiting row: `batches.waitingSecondImei` "Waiting for IMEI 2 of {{code}}" with a **Skip** button. The next scanned code goes to `POST /items/:id/identifiers` with `{ type: 'IMEI', value }` (15 digits) or `{ type: 'SERIAL', value }` (anything else). On success show `batches.secondCodeAdded` "{{code}} added to the same phone" and go back to "new phone" mode. On error toast the API message and stay in waiting mode.
- Add a button **Add code to last phone** (`batches.addCodeToLast`), enabled once a device was created in this session. Pressing it puts the panel into the same waiting mode for the last created device, for one scan.
- Show a small "last phone" card under the input: model, all its codes, link to `/items/:id`. Update it after every scan or added code.
- Keep the hook under 50 lines: put the "pending target" state (`{ itemId, code } | null`) and the two submit paths in `model/useScanTarget.ts`.

### 2. Dropped scan message

In `useScanLineSubmit`, when a code arrives while `isPending` is true, show `toast.warning(t('batches.scanBusy'))` "Still saving the previous code, scan it again". Never drop a scan silently.

### 3. Show all codes in the line table

`codeDisplay` in `BatchLinesTable` shows only the first identifier. Show all of them joined by ` · `.

### 4. Unpriced lines badge **(needs BE)**

`Batch.unpricedLines` (view_cost only). When > 0 show a warning badge in the header card: `batches.unpricedLines` "{{count}} lines without price". Clicking it opens the "price all" dialog below.

### 5. Price all lines of one model **(needs BE)**

New dialog `PriceAllDialog` (manage_prices): select a model from the distinct models of `batch.lines`, enter unit price, `PATCH /batches/:id/lines` with `{ productModelId, unitPrice }`. Button `batches.priceAll` "Price all of one model" next to "Add accessories". Invalidate the batch query on success.

### 6. Extra cost with split NONE

In `createBatchFormSchema`: when `extraCostTotal` > 0 and `costSplitMethod` is `NONE`, add an issue on `costSplitMethod`: `batches.validation.splitRequired` "Choose how to split the extra cost, or set it to 0". The server also refuses it (400); show that message through `FormError` like other API errors.

### 7. Remove a line **(needs BE)**

Permission `delete_records`. A trash button on each line opens a confirm dialog (`DialogFormFooter` with `destructive`):

- Device line: `batches.removeDeviceConfirm` "Remove {{code}} from this batch? The device is deleted from stock." Only show the button when `line.item.status === 'IN_STOCK'`.
- Accessory line: `batches.removeAccessoryConfirm` "Remove {{quantity}} × {{model}} from this batch? Stock at the batch location goes down by that amount."
- `DELETE /batches/:id/lines/:lineId`, invalidate batch, items and accessory stock queries. Show API 409 messages in the dialog.

### 8. Repricing a sold device

In `LinePriceDialog`, when `line.item` exists and its status is `DEBT`, `SOLD` or `RETURNED`, show a note: `batches.repriceSoldNote` "This device is already sold. The profit of that sale does not change." Still allow saving.

### 9. Locked batch **(needs BE)**

When `batch.isLocked` is true and the user lacks `edit_past_records`: hide the scan panel, "Add accessories", "Price all", "Edit batch", set-price and remove buttons; show a notice `batches.lockedNotice` "This batch is older than 3 days and is locked." Users with `edit_past_records` see everything.

### 10. Types and hooks

Add `isLocked`, `unpricedLines?` to `BatchSummary` / `Batch` in `entities/batch/model/types.ts`. Add `useRemoveBatchLine`, `usePriceBatchModel` to `entities/batch/api`. `useAddIdentifier` exists in `entities/item` or add it there.

## Translations

Every new key in `uz.json`, `ru.json` and `en.json` (same keys; `pnpm lint` runs the i18n check). Keys named above under `batches.*`.

## Done when

- `pnpm lint`, `pnpm build` pass in the worktree.
- With the server from `F04-BE-03`: scan a phone with dual SIM on, both IMEIs end up on one device; a glued code shows the server error; a ghost line can be removed by Admin; staff see a locked batch read-only.
