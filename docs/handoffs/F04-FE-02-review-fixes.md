You are the frontend developer of the BLACKSTORE project. **Work in the worktree `.worktrees/F04-FE-01` (branch `task/F04-FE-01`), ONLY in its `client/` folder**; run `pnpm` from `.worktrees/F04-FE-01/client`. Follow `AGENTS.md`, `docs/rules/frontend.md` and `.claude/agents/frontend-developer.md`. Do not touch `server/` or `docs/`. Do not commit. No new dependencies.

# F04 frontend: review fixes
The three reviews of `F04-FE-01-buying.md` found the items below. Fix them, smallest change that works.

## Missing or wrong (fix first)
1. `pages/batches/ui/BatchDetailPage.tsx`: there is no "Add accessories" button, so `AccessoryLineDialog` can never open. Add the button (gated by `receive_batch`, hidden when the batch is not editable) that calls `setAccessoryOpen(true)`.
2. `features/receive-batch/ui/BatchFormFields.tsx` ~156-158: in edit mode supplier, owner and location are editable but the PATCH payload ignores them. Disable those three selects when editing.
3. `features/receive-batch/ui/BatchScanPanel.tsx` ~131, 185: `disabled={isPending}` on the scan input makes it lose focus after every scan. Never disable the input; instead `if (isPending) return;` at the top of `submitLine`.
4. `shared/lib/dates.ts` ~3: `toISOString()` gives the UTC date, so between 00:00 and 05:00 local the default date is yesterday. Build it from `getFullYear/getMonth/getDate`.
5. `features/manage-suppliers/ui/SupplierFormContent.tsx` ~21-23 and `features/receive-batch/ui/BatchFormContent.tsx` ~26: empty strings are dropped (`|| undefined`), so a cleared note, country or phone can never be saved. On update send the trimmed value (`''` or `null`, whatever the contract accepts).
6. `entities/supplier/api/index.ts` ~87-88, 110-112: invalidate by prefix (`[...all, 'payments', id]`, and a `lists()` prefix for supplier updates) so page 2 is not stale.
7. `features/print-label/ui/LabelPage.tsx` ~11-25 + `LabelPrintButton.tsx` ~16-23: the system code is generated twice and the page effect re-runs on every refetch. Keep one path: the button becomes a plain `<Link>` to `/items/:id/label`; the page calls the mutation once (`isIdle` guard).
8. `app/routes/index.tsx` ~92: gate the label route with `receive_batch`, not `view_stock` (same as the button).
9. `features/receive-batch/ui/BatchScanSettingsFields.tsx` ~240 and `AccessoryLineFields.tsx` ~412: cost inputs need `manage_prices` AND `view_cost`, same rule as `entities/item/ui/ItemPriceInputs.tsx`.

## DRY and cleanup
10. Five hand-rolled submit hooks (`SupplierFormContent`, `BatchFormContent`, `AccessoryLineFields`, `SupplierPaymentContent`, `LinePriceDialog`) re-implement `shared/lib/useCreateOrUpdate`. Use it.
11. 19 copies of the `Label + Input + error <p>` block: lift one `TextField` into `shared/ui` and use it in the F04 forms (leave older features alone).
12. Delete: `shared/types/jsbarcode.d.ts` only if `@types/jsbarcode` is already installed (otherwise keep it); unused `WalkInSeller` in `features/walk-in-purchase/api/index.ts`; unused `getSystemCode` export in `features/print-label/index.ts`; `AMOUNT_PATTERN` in `features/manage-investors/model/investor.schema.ts` (import the shared money pattern).
13. `WalkInPurchaseForm.tsx` ~236: `t('common.save') + '…'` → `t('common.loading')`; ~180-182 fold the two branches into one `t(status === 409 ? ... : ...)`; ~91 type as `Category | undefined`. `LinePriceDialog.tsx` ~32: `key={line.id}`. `BatchScanSettingsFields.tsx` ~45: shared `Label` instead of raw `<label>`.
14. Suppliers table: no phone column (the contract's list shape has no phone; the handoff was wrong). Leave as is.
15. Keep `CameraScanButton` imported from `@/features/scan` for now; the allocator changes it at merge.

## Before you finish
- `pnpm build` and `pnpm lint` pass; `uz.json` and `ru.json` have identical keys.
- No file over 300 lines, no function over 50.
- Report in under 15 lines: what changed per item, anything skipped.
