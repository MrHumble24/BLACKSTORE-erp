Working tree: main repo, `client/` only. Follow `CLAUDE.md`, `.claude/agents/frontend-developer.md` and
`docs/rules/frontend.md`. Do not commit.

# F19-FE-02 — Bulk add devices: review fixes — frontend

Fixes from the code, security and PRD reviews of F19 (`docs/handoffs/F19-FE-01-bulk-add-devices.md`).
Files: `client/src/features/bulk-add-items/**`, `client/src/pages/items/ui/BulkAddPage.tsx`,
`client/src/features/receive-batch/model/useScanTarget.ts`, locale files. Carry out every item.

## Must fix

1. **Scanning gets stuck after "Reset settings"** (`ui/BulkAddSettings.tsx:19-22`). Reset changes the
   enabled codes while a device is half scanned, so the current step becomes empty and every scan is
   silently ignored. Call `cancelDevice()` from the reset handler, exactly like `BulkAddCodesToggle`
   already does.
2. **Slice root missing** (FSD rule). Add `client/src/features/bulk-add-items/index.ts` exporting the
   UI components, `useBulkAddStore`, `useBulkScan` and the new hook from item 3. `BulkAddPage.tsx` imports
   only from `@/features/bulk-add-items`.
3. **Functions over 50 lines**: `BulkAddPage` (64), `BulkAddSettingsFields` (61), `useBulkScan` (56),
   `BulkScanPanel` (55).
   - Move the user-change reset effect out of the page into `model/useBulkAddUserGuard.ts` (feature
     hook; the page only calls it). While the stored `userId` does not yet match the logged-in user,
     return `ready: false` and have the page render nothing for the settings so the previous user's
     values never flash for a frame.
   - One helper `useResetMissingId(list, id, onMissing)` replaces the four copied stale-id effects in
     `BulkAddSettingsFields.tsx:24-34,72-82`; depend on the selected id and the list, not the whole store.
     Also reset the model when its category's model list loaded **empty** (today the reset only runs
     for a non-empty list, so a category with every model deactivated still sends a server 400).
   - `useBulkScan`: inline `resetDevice` as a closure (it only exists to receive four setters), build
     `steps` as `(['imei','imei2','serial'] as const).filter((s) => config.codes[s])`, one small
     `price(value, allowed)` helper for the three price spreads, delete the unused `isCreatingRef`.
   - `BulkScanPanel`: `t(\`bulkAdd.scanLabel.${step}\`)` and `pending[step]` instead of the `if`
     chains; type the prop with the existing `BulkScanState` type; pass `inputRef` as is (no cast).
4. **Failed save keeps the old code in the input** (`model/useBulkScan.ts:164`). On a non-409 error the
   input is not cleared, so the next scanner read appends to it and gives a false "invalid IMEI".
   Clear the input before refocusing on every error path (pending codes are still kept, as specified).
5. **Busy guard races** (`useBulkScan.ts:203`). Two fast Enter presses can send two requests for the
   same device because `isPending` only updates after a re-render. Guard with a ref that is set
   synchronously when the request starts and cleared in `onSettled` (or use `mutateAsync` with a local
   flag). Keep the `bulkAdd.busy` warning.
6. **`autoFocus`** on `ScanCodeInput` in `BulkScanPanel` (spec asked for it; the cursor must be in
   the scan box when the page opens).

## Small fixes

7. Delete the "backward compatibility" re-export of `useScanErrorToast` in
   `features/receive-batch/model/useScanTarget.ts:20-21`; nothing imports it from there.
8. `BulkScanPanel.tsx:31,51` uses `batches.scanPanelTitle` and `batches.scanInputLabel`. Add
   `bulkAdd.scanPanelTitle` and `bulkAdd.scanInputLabel` to uz/ru/en instead.
9. Disable "Cancel device" while a create is in flight (`BulkScanPanel.tsx:59-63`).
10. `model/bulkAdd.schema.ts:33-48`: merge the two codes checks into one `if (!codes.imei && !codes.serial)`,
    drop the early `return`s so a codes error and a price error can show together, add a one-line doc
    comment on `createBulkAddSchema`.
11. `model/bulkAdd.store.ts`: type `setField` as
    `<K extends keyof BulkAddConfig>(key: K, value: BulkAddConfig[K]) => void` and remove the cast.
12. Components read the whole store (`useBulkAddStore()` without a selector in `BulkAddSettings`,
    `BulkAddSettingsFields`, `BulkAddPriceFields`, `BulkAddCodesToggle`), so every price keystroke
    re-renders all of them. Select only the fields and actions each one uses; keep one `selectConfig`
    selector next to the store for the page/scan hook instead of repeating the field list.

## Done when

`npm run build` and `npm run lint` pass in `client/`; every file ≤ 300 lines and every function ≤ 50;
and in the browser: reset settings mid-device no longer blocks scanning, a failed save leaves an empty
input, the input is focused on page open, and the scan card texts come from `bulkAdd.*` keys.
