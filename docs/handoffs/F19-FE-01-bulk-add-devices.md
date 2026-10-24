Working tree: main repo, `client/` only (no server change; no other client task is running, so no
worktree is needed). You are the frontend developer for this task: follow `CLAUDE.md`,
`.claude/agents/frontend-developer.md` and `docs/rules/frontend.md`. Do not commit; when done, run
`npm run build` and `npm run lint` in `client/`, verify the flow in the browser (dev servers are on
http://localhost:5173 and http://localhost:3000) and report back what you built and what you tested.

# F19-FE-01 — Bulk add devices by scanning (items page) — frontend

## Feature

Today `/items` has one "Add item" dialog: every field is typed for every device. Staff receive
hundreds of identical devices at a time, so we add a **Bulk add** screen: configure the device
specs **once** (category, model, owner, location, condition, attributes, prices) and choose **which
codes each device gets** (IMEI 1, IMEI 2, serial). After that the user only scans codes: when the
last expected code of a device is entered, the device is created with one `POST /items`, the
list grows by one, and the input is ready for the next device. The configuration is kept in a
**persisted Zustand store** so it survives reloads and comes back the next day.

PRD: FR-1 (one record per device), FR-2 (duplicate identifier blocked with a clear message),
FR-3 (category fields), FR-12/FR-13 (USB scanner as keyboard input + camera fallback), G4 (fast
daily work). Same spirit as FR-14 batch scanning, but for standalone items (opening stock), exactly
like the existing "Add item" dialog: no batch, no supplier.

## API (already live, no change)

- `POST /items` (permission `receive_batch`) → `Item` (201). Body = `CreateItemPayload` in
  `client/src/entities/item/model/types.ts`:
  `{ productModelId, investorId, locationId, condition?, attributes?, identifiers: {type,value}[], purchasePrice?, salePrice?, minSalePrice? }`.
  Caps: at most 2 `IMEI`, 1 `SERIAL`; at least one IMEI or SERIAL. Price fields need
  `manage_prices`. Duplicate code → **409** with a message that cites the owner
  (`... already belongs to item #42`).
- Use the existing `useCreateItem()` hook. Do **not** add a bulk endpoint: one request per device
  gives immediate duplicate feedback per scan (FR-2) and a scanner cannot outrun it.

## Reuse (do not re-implement)

- `entities/item`: `useCreateItem`, `buildIdentifiers`, `formatAttributes`,
  `validateRequiredAttributes`, `IMEI_REGEX`, `SCAN_CODE_REGEX`, `ItemCategoryModelSelects`,
  `ItemOwnerLocationSelects`, `ItemDynamicAttributes`.
- `shared/ui`: `ScanCodeInput` (Enter submits, camera button), `SelectField`, `TextField`, `Switch`,
  `Button`, `BackLink`.
- `shared/lib`: `normalizeMoney`, `POSITIVE_MONEY_PATTERN`.
- `features/receive-batch/model/useScanTarget.ts` has `useScanErrorToast()` (409 toast with an
  "open item #N" action). Features may not import each other, so **move** it down to
  `entities/item/lib/useScanErrorToast.ts`, export it from `entities/item`, and make
  `receive-batch` import it from there (delete the copy). Behaviour unchanged, except the action
  label: use a new key `items.openItem` (same text as `batches.openItem`, all three languages) so
  the item layer does not depend on batch translations.
- Model for the whole screen: `features/receive-batch/ui/BatchScanPanel.tsx` (settings once, then
  scan). Copy the UX, not the code.

## Where

- Route `items/bulk-add`, permission `receive_batch`, in `client/src/app/routes/index.tsx` next to
  `items/import`. Page component `BulkAddPage` in `client/src/pages/items/ui/BulkAddPage.tsx`,
  exported from `pages/items`.
- `pages/items/ui/ItemsPage.tsx` header: beside the existing "Add item" button add an outline
  button **"Bulk add"** (icon `ScanLine`) that navigates to `/items/bulk-add`. Same
  `receive_batch` gate.
- New slice `client/src/features/bulk-add-items/` with `index.ts`, `model/`, `ui/`.

## Zustand store (persisted)

`features/bulk-add-items/model/bulkAdd.store.ts`, `create` + `persist` middleware from `zustand`
(already installed, v5; no new dependency), localStorage key `blackstore-bulk-add`.

```ts
interface BulkAddCodes { imei: boolean; imei2: boolean; serial: boolean }   // which codes each device gets
interface BulkAddConfig {
  categoryId: number; productModelId: number; investorId: number; locationId: number;
  condition: ItemCondition; attributes: Record<string, string | number>;
  purchasePrice: string; salePrice: string; minSalePrice: string;
  codes: BulkAddCodes;
  /** Id of the user who saved these settings; another user starts clean (shared computers). */
  userId: number | null;
}
```

Defaults: ids `0`, `condition: 'NEW'`, `attributes: {}`, prices `''`, `codes: { imei: true, imei2: false, serial: false }`.
Actions: `setField(key, value)`, `setCategory(id)` (also resets `productModelId` to 0 and
`attributes` to `{}`), `setCodes(partial)`, `reset()`.
**`partialize`: persist everything except `purchasePrice`** (cost must not sit in localStorage on a
shared computer; it is re-typed per session). Comment why.
On page mount: if `userId` differs from the logged-in user's id, call `reset()` and store the
current id (settings and the in-memory purchase price never carry over to another user). Also on
mount, once categories/models/investors/locations are loaded, any saved id that is no longer in
its option list is set back to `0` (deactivated master data), so the first scan shows "Select …"
instead of a server 400.
This store holds **configuration only**. Scanned codes in progress and the list of devices added
this session are plain `useState` in the hook below (not persisted, not in the store).

## Validation

`model/bulkAdd.schema.ts`: `createBulkAddSchema(t, attributesList)` (zod) over `BulkAddConfig`:
category/model/owner/location required (reuse the `items.validation.*` messages), prices optional
but must match `POSITIVE_MONEY_PATTERN` when non-empty (`bulkAdd.validation.priceInvalid`),
minimum price must not exceed sale price when both are set (reuse
`items.validation.minPriceAboveSale`; the server rejects it and a saved bad pair would fail every
scan), `validateRequiredAttributes`, and at least
one of `codes.imei` / `codes.serial` on (`imei2` alone is not allowed; message
`bulkAdd.validation.codesRequired`). Run it when the user submits a scan with no device in
progress; show errors inline on the settings fields and do not consume the code.

Per-scan rules (toast error, keep the step, clear the input):
- IMEI 1 / IMEI 2 step: must match `IMEI_REGEX` (15 digits) → else `items.validation.invalidImei`.
- IMEI 2 must differ from IMEI 1 of the same device → `bulkAdd.validation.sameImei`.
- Serial step: must match `SCAN_CODE_REGEX` → else `items.validation.invalidSerial`.
- Codes are trimmed and upper-cased (`buildIdentifiers` does this).

## Scan flow (`model/useBulkScan.ts`)

- `steps` = enabled codes in fixed order `imei → imei2 → serial`. `pending` = codes collected for the
  current device (`{ imei, imei2, serial }` strings), `stepIndex` = which one is expected next.
- `submitCode(raw)`: if a create is in flight → `toast.warning(t('bulkAdd.busy'))` and return. If this
  is the first code of a device, validate the config first (above). Validate the code for the current
  step, store it, advance. When all steps are filled → `createItem` with
  `identifiers: buildIdentifiers(pending)` plus the config fields (`formatAttributes` for attributes,
  `normalizeMoney` for non-empty prices; send `purchasePrice` only when the user has `manage_prices`
  **and** `view_cost`, `salePrice`/`minSalePrice` only with `manage_prices`).
- On success: prepend the created `Item` to `added` (session list), `toast.success(t('bulkAdd.added', { code }))`,
  reset `pending`, clear and **refocus** the input (one-hand flow; use a ref like `BatchScanPanel`).
- On error: `useScanErrorToast()` (409 gets the "open item" action); keep `pending` so the user can
  rescan the wrong code, except on a 409 from the device create, where `pending` is cleared: one of
  the codes already belongs to another item and nothing was created (usually the same phone was
  scanned twice), so the user starts the next device. Note: with two or three codes per device the
  duplicate is only reported after the last code of that device.
- `cancelDevice()`: drops `pending`, back to step 0.

## UI (`BulkAddPage`)

Desktop first (staff use USB scanners), one column, max width like other detail pages, `BackLink`
to `/items`, title `bulkAdd.title`, subtitle `bulkAdd.subtitle`.

1. **Settings card** (`ui/BulkAddSettings.tsx`): `ItemCategoryModelSelects` (serialized categories
   only, like `ItemFormContent`), `ItemOwnerLocationSelects`, `ItemDynamicAttributes` for the chosen
   category, price inputs (`TextField`, same permission gates as `ItemPriceInputs`: nothing without
   `manage_prices`; purchase price additionally needs `view_cost`). All fields read from and write to
   the store directly (no react-hook-form; the store is the form). Disabled while a create is
   pending. A small "Reset settings" link button calls `reset()`.
2. **Codes card** (`ui/BulkAddCodesToggle.tsx`): three `Switch` rows labelled with the existing
   `items.imei1`, `items.imei2`, `items.serial` keys, bound to `codes`, hint `bulkAdd.codesHint`. Changing a toggle calls `cancelDevice()`.
3. **Scan card** (`ui/BulkScanPanel.tsx`): step strip showing every enabled code with the current
   one highlighted and the collected values under the done ones (e.g. `IMEI 1 ✓ 35…  → IMEI 2  → Serial`);
   `ScanCodeInput` (label = `bulkAdd.scanLabel.<step>`, i.e. "Scan IMEI 1" etc., `autoFocus`);
   "Cancel device" outline button visible only when `pending` has something.
4. **Added this session** (`ui/BulkAddedList.tsx`): count badge, newest first, each row: model name,
   codes joined with ` · `, condition badge (`ItemConditionBadge`), link `/items/:id`. Empty state
   `bulkAdd.emptyList`. No "clear" button and no row cap: the list is per session and simple rows
   are cheap.

Staff must never see cost: purchase price input and any cost figure only with `view_cost`.

## Translations

Add the same keys to `uz.json`, `ru.json`, `en.json` under `bulkAdd.*`: `title`, `subtitle`,
`button` (items page), `settings`, `codes`, `codesHint`, `scanLabel.imei`, `scanLabel.imei2`, `scanLabel.serial`, `scanPlaceholder`, `scanHelp`,
`cancelDevice`, `resetSettings`, `added` (`{{code}}`), `busy`, `addedList`, `emptyList`,
`validation.codesRequired`, `validation.sameImei`, `validation.priceInvalid`; plus `items.openItem`.
Reuse existing `items.*` keys for IMEI 1 / IMEI 2 / serial labels and validation messages. No
hard-coded strings.

## Rules reminder

- FSD: `pages/items` → `features/bulk-add-items` → `entities/*` → `shared/*`. The feature slice never
  imports another feature. Import from slice roots only.
- TanStack Query for the API (`useCreateItem`), Zustand only for the persisted config, `useState` for
  the in-progress device and the session list.
- Max 300 lines per file, 50 per function/component. Short comment on each public hook/component.
- Reactive reads from react-hook-form must use `useWatch` (not relevant here: no RHF in this slice).
- Done = `npm run build` and `npm run lint` pass in `client/`, and the flow works in the browser with
  IMEI-only, IMEI+IMEI 2, IMEI+serial, serial-only, including a duplicate code (409 toast with link)
  and a reload that keeps the settings but not the purchase price, and a different user logging in
  on the same browser sees clean settings.
