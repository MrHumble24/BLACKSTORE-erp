You are the frontend developer of the BLACKSTORE project. Work ONLY in `client/`. Read `GEMINI.md` (or `AGENTS.md`), `docs/rules/frontend.md` and `.claude/agents/frontend-developer.md` first and follow them. Do not touch `server/` or `docs/`. Use `pnpm` in `client/`. Do not commit.

**Another developer works in `client/` at the same time** on F02 pages: `features/manage-locations`, `manage-categories`, `manage-product-models`, `manage-investors`, `pages/locations`, `pages/categories`, `pages/investors` and the F02 entity hooks. Do not touch those folders. In shared files (`shared/i18n/locales/*.json`, `widgets/app-shell`, `app/routes`, `shared/ui`) only add or change the lines you need; never reorder or reformat.

# F03 (Items): review fixes

The security review passed. The PRD check and the code review ask for the changes below. The F01 fixes were all verified. Make these fixes, nothing more. Keep every file under 300 lines and **every function under 50**.

## Bugs (must)
1. **Required attributes are never enforced.** `entities/category/model/types.ts` names the field `isRequired`; the API sends `required`. Rename to `required` everywhere (`features/manage-items/model/item.schema.ts`, `ItemDynamicAttributes.tsx`).
2. **Empty NUMBER attribute becomes 0.** `ItemDynamicAttributes.tsx` ~line 88 does `Number(e.target.value)`, so a cleared required number passes validation and sends `0`. Keep the raw string in the form; in `onSubmit` drop empty values and convert the rest with `Number`.
3. **Removed statuses.** `RESERVED` and `IN_TRANSIT` no longer exist (contract updated). Remove them from `entities/item/model/types.ts`, `ItemStatusBadge.tsx`, `pages/items/ui/ItemsFilters.tsx` and the `items.status.*` keys in both locale files.
4. **Item details page stuck on "loading"** (`pages/items/ui/ItemDetailsPage.tsx` ~45) when the item is missing or the id is not a number. Show a not-found text (`items.noItems`) with a back button when the query errored or finished without an item.
5. **Camera** (`features/scan/lib/useCameraBarcodeScanner.ts`, `CameraScanButton.tsx`, `ScanField.tsx`):
   - the effect depends on `onScan`/`onClose`, which are new functions each render, so the camera restarts whenever the parent re-renders. Keep the callbacks in refs and depend on `[open]` only;
   - after a hit, `clearInterval` and set an `active = false` guard **before** calling `onScan`, so the 300 ms tick cannot fire twice;
   - `getUserMedia` failure is silent: show `toast.error(t('scan.cameraError'))` (add the key in uz and ru);
   - the detected code must go **into the scan field** (then the normal Enter/lookup runs), not call the lookup directly;
   - delete `handleOpenChange` and the returned `stopStream`: the effect cleanup on `open=false` already stops the tracks. Pass `setOpen` straight to `onOpenChange`.
6. **Scan field** (`features/scan/ui/ScanField.tsx`): add `maxLength={40}` and skip the lookup unless the value matches `/^[A-Z0-9-]{4,40}$/i` (reuse the regex from `item.schema.ts`, move it to `entities/item/model` if both need it).
7. **Search fires a request per keystroke** (`pages/items/ui/ItemsFilters.tsx` ~45). Use `useDeferredValue` on the search text, or submit on Enter like the scan field.

## Rule breaks (must)
8. **FSD layer breaks.** (a) `features/manage-items/ui/ItemPriceInputs.tsx`, `ItemPricesDialog.tsx` and `features/manage-accessory-stock/ui/AccessoryStockFormDialog.tsx` import `@/features/auth` (same layer). Move `auth.store.ts` (with `hasPermission`) down to `entities/session/model` with an `index.ts`, and have `features/auth` re-export it so nothing else breaks. (b) `entities/accessory-stock/api/index.ts` imports `Page` from `@/entities/item`, and `Page<T>` is declared in both `entities/item/model/types.ts` and `entities/user/model/types.ts`. Put one `Page<T>` in `shared/types` and import it in all three.
9. **Hard-coded English.** `ItemDynamicAttributes.tsx` ~40 "Attributes" (key `items.attributes` exists), `ItemIdentifierInputs.tsx` ~32/48/64 and `AddIdentifierDialog.tsx` ~112 placeholders ("15 digits", "e.g. F2LZ..."), `AddIdentifierDialog.tsx` ~99 "SYSTEM CODE", `ItemOwnershipCard.tsx` ~28 renders raw `location.type`. Use i18n keys (add `locations.type.WAREHOUSE` / `SHOP` if the F02 developer has not added them yet; check the files first).
10. **Six components import `type AxiosError`** (`UserFormContent.tsx`, `ToggleUserStatusButton.tsx`, `LoginForm.tsx`, `ItemFormContent.tsx`, `AddIdentifierDialog.tsx`, `ScanField.tsx`). `getApiErrorMessage(err: unknown)` already hides axios. Add one helper next to it, `getApiErrorStatus(err: unknown): number | undefined`, and remove every axios import outside `shared/api`. Then replace the three copies of the "409 → duplicate key" branch (`ItemFormContent.tsx` ~92, `AddIdentifierDialog.tsx` ~57, `UserFormContent.tsx` ~23) with that helper.

## Shrink (same pass; this is what gets the functions under 50 lines)
11. **Form state kept twice.** `ItemFormContent.tsx` `useItemFormState` holds 7 `useState`s that mirror react-hook-form. Use `watch(...)` and `setValue` only. Same pattern in `AccessoryStockFormDialog.tsx` `useAccessoryStockState`.
12. **Shared UI pieces** in `shared/ui`: `TablePagination` (copied in `UsersTable.tsx`, `ItemsTable.tsx`, `AccessoriesTable.tsx`), `DialogFormFooter` (Cancel/Save, copied in 6 dialogs; use `<Button variant="outline">` with no extra classes), `FormError` (the orange banner, copied 5 times), `SelectField` (label + select + error, copied ~10 times). Make the uppercase label style the `Label` default in `shared/ui/label.tsx` and drop the repeated class string. Also one shared loading/empty table row.
13. **Delete no-ops**: `.filter(isActive)` and `useMemo`s over `useCategories/useProductModels/useInvestors/useLocations` (they already return active only) in `ItemFormContent.tsx` ~126-142, `AccessoryStockFormDialog.tsx` ~88-95, `AccessoriesFilters.tsx` ~22. Keep only the `isSerialized` filters. Delete the `Number()` money comparison in `ItemPricesDialog.tsx` ~37-42 (the server returns a 400 that the form already shows). Delete the alias `ItemDetails` (use `Item`), delete the unused `AccessoryStockWithCost`, type `useUpdateItemPrices` as `ItemWithCost`, and type `ItemFilters.status` as `ItemStatus`.
14. Import from `@/shared/lib` (the index), not `@/shared/lib/formatMoney` / `utils`, in `ItemsTable.tsx`, `ItemPricingCard.tsx`, `AccessoriesTable.tsx`, `AppSidebar.tsx`.
15. `src/index.css`: delete the leftover `--radius-full` and `--shadow-subtle` tokens if nothing uses them.

## Before you finish
- `pnpm build` and `pnpm lint` in `client/` pass; `uz.json` and `ru.json` have identical keys.
- No file over 300 lines, **no function over 50** (check every function you touched).
- Report in under 25 lines: what changed per item, anything you could not do.
