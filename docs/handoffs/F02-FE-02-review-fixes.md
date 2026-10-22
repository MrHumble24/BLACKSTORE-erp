You are the frontend developer of the BLACKSTORE project. Work ONLY in `client/`. Read `GEMINI.md` (or `AGENTS.md`), `docs/rules/frontend.md` and `.claude/agents/frontend-developer.md` first and follow them. Do not touch `server/` or `docs/`. Use `pnpm` in `client/`. Do not commit. You are the only developer in `client/` for this task.

# F02 (Master data pages) + F03 leftovers: review fixes

The PRD check found no business-rule problems. Security found three LOW items. The code review asks for one bug fix and a clean-up of duplicated pieces. Make these fixes, nothing more. Keep every file under 300 lines and **every function under 50**.

## Bugs (must)
1. **Categories "Edit" does nothing.** `pages/categories/ui/CategoriesPage.tsx` ~37: `onEdit={setEditing}` never opens the dialog. Use `onEdit={(c) => { setEditing(c); setOpen(true); }}` like `LocationsPage`.
2. **Locations table header shows a raw key.** `pages/locations/ui/LocationsTable.tsx` ~58: `t('locations.type')` points at a nested object. Use `locations.typeLabel` (exists in both locales).
3. **Transaction date is wrong by one day in Uzbekistan.** `features/manage-investors/ui/InvestorTransactionContent.tsx` ~48: `new Date('yyyy-mm-dd').toISOString()` gives midnight UTC. Send the `yyyy-mm-dd` string as typed (the server accepts an ISO date). Also ~18: `TODAY_ISO` is computed once at module load, so after midnight the default is yesterday; compute it inside the component.
4. **Attribute key rule differs from the server.** `features/manage-categories/model/category.schema.ts` ~22: use `/^[a-z][a-z0-9_]*$/` and `.max(50)`; `label` `.max(100)`; `options`: split, trim, drop empties, reject more than 50 items or any item over 50 characters (the server caps there).

## Rule breaks (must)
5. **axios outside `shared/api`.** `entities/investor/ui/InvestorActiveToggle.tsx`: use `getApiErrorStatus(err) === 400` from `shared/api`.
6. **Old field name.** Delete the `isRequired?` alias in `entities/category/model/types.ts` and the `?? attribute.isRequired` fallbacks in `features/manage-categories/ui/AttributeFormContent.tsx` ~61 and `pages/categories/ui/AttributesTable.tsx` ~76. Only `required` exists.
7. **Hard-coded text.** `AttributeFormFields.tsx` ~30 `"storage"` and ~112 `"64GB, 128GB, 256GB"`, `InvestorFormFields.tsx` ~36 `"S"`, `InvestorTransactionFields.tsx` ~44 `"1500.00"` → i18n keys in uz and ru.

## Duplicates: delete the copies, use the shared pieces (must; this is what gets the functions under 50 lines)
8. `shared/ui/form-actions.tsx` duplicates `DialogFormFooter` + `FormError`. Switch the six F02 `*FormContent.tsx` to `DialogFormFooter`/`FormError`, delete `form-actions.tsx` and its export.
9. `widgets/table-pagination/` and `pages/users/ui/UsersPagination.tsx` are copies of `shared/ui/TablePagination`. Point `pages/investors/ui/InvestorDetailPage.tsx` at the shared one, delete both copies.
10. Loading/empty rows are hand-rolled in the locations, categories, category-models, investors, investor-transactions and users tables. Use `TableLoadingRow`/`TableEmptyRow` from `shared/ui/TableRows`.
11. `SelectField` exists but is unused. Replace every inline label + select + error block with it: `features/manage-items/ui/ItemOwnerLocationSelects.tsx`, `ItemCategoryModelSelects.tsx`, `features/manage-accessory-stock/ui/AccessorySelectFields.tsx`, and the F02 form fields where the same block appears.
12. Four identical `*ActiveToggle.tsx` files in `entities/{location,category,product-model,investor}/ui`. One `shared/ui/ActiveToggleButton` with props `isActive`, `isPending`, `onToggle` (i18n `common.activate`/`common.deactivate`); the entity files become 5-line wrappers or disappear.
13. The `Label` default is already uppercase. Delete every `className="text-xs font-medium text-slate uppercase"` passed to `Label` (about 20 places in manage-items, manage-users, auth, manage-accessory-stock).
14. `app/routes/index.tsx`: nine identical `<Route><ProtectedRoute permission>` blocks → one `[{ path, permission, Page }]` array and a `.map`.
15. The five F02 `*FormContent.tsx` paste the same `onSubmit` / `onSuccess` / `handleError` / create-vs-update block. One `useCreateOrUpdate(create, update, onDone)` hook in `shared/lib` (or `entities` if it needs entity types) used by all five.
16. Small: `entities/investor/api/index.ts` ~109 extra `invalidateQueries(['investors','transactions'])` (the `all` key covers it) and unused `categoryAttributeKeys` in `entities/category/api/index.ts` ~32 → delete. `ItemFormContent.tsx` ~100 `preSelectedCatId` state mirrors the watched `categoryId` → derive, delete the state. Attribute type labels: one map `{ TEXT: 'categories.typeText', … }` in `entities/category` used by both `AttributesTable.tsx` and `AttributeFormFields.tsx`. Move `CategoriesBackLink` out of `CategoryModelsTable.tsx` and merge it with `InvestorsBackLink` into one `shared/ui/BackLink`.

**Optional, only if it stays small:** one `PageHeader` (title, subtitle, add button) for the three list pages and one `EditButton` for the five table rows.

## Before you finish
- `pnpm build` and `pnpm lint` in `client/` pass; `uz.json` and `ru.json` have identical keys.
- No file over 300 lines, **no function over 50** (count every function you touched; the review listed 23 over the limit, most of them in the files above).
- Click through once in the browser if the backend is running: categories edit opens, locations header is translated.
- Report in under 25 lines: what changed per item, anything you could not do.
