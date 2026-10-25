# UI-08 — iOS category detail: review fixes (web parity + code review)

Worktree `.worktrees/UI-08`, branch `task/UI-08`. Files under `mobile/BlackStore-ERP/BlackStore-ERP/`.
Do not commit. Fixes for UI-07 (merged as dfaeb9a) from the PRD and code reviews. The owner's rule:
the iOS screens must behave exactly like the web (`client/src/pages/categories`,
`client/src/features/manage-categories`, `client/src/features/manage-product-models`, `uz.json`).

## Web parity (PRD review)

1. **Category on/off switch lives on the list row, like the web.** `CategoriesManagementView`: each
   row gets a trailing swipe action "O'chirish" / "Yoqish" (and the same action in a long-press
   context menu) that calls `updateCategory(isActive:)`. Remove the active toggle from
   `CategoryFormSheet` (web edit form = name + serialized only). The detail header keeps its badge.
2. **Threshold minimum = web.** `ModelFormSheet`: empty = no alert; otherwise a positive integer
   (≥ 1) with the web error "Chegara musbat butun son bo'lishi kerak". Footer text as in `uz.json`
   (`productModels.lowStockThresholdHelp`). Send `null` when empty.
3. **Empty name shows a message.** `CategoryFormSheet` and `ModelFormSheet`: once the name field has
   been edited and is empty, show "Ismni kiriting" / "Model nomini kiriting" (web keys
   `validation.nameRequired`, `productModels.validation.nameRequired`) under the field; Save stays
   disabled.
4. **Wording = web `uz.json`.** List row subtitle: `categories.serialized` / `categories.notSerialized`
   full strings. Attribute row: "Majburiy maydon: Ha" (web column) instead of the badge. Section
   buttons: `categories.addAttribute` ("Xususiyat qo'shish") and `categories.addModel`
   ("Model qo'shish"). Page subtitle `categories.subtitle` as the list's first section footer.
5. **Success messages like the web toasts**: after each save show the matching `uz.json` text
   (category created/updated, attribute added/updated, model created/updated) via `InlineMessage`
   at the top of the screen, cleared on the next action.
6. **Remove what the web does not have**: the attribute count on list rows, the inactive-category
   footer, the "#n" order prefix (show the plain number under an "Tartib" label), and the extra
   client-side sort of attributes (server order).

## Code review

7. **MEDIUM** Sheets clear the shared `errorMessage` on open/close, which hides a failed models
   load. Give each sheet its own `formError` (from the save result) and leave
   `CategoriesViewModel.errorMessage` for screen loads only.
8. **MEDIUM** The list and the detail share one view model, so a detail error shows on the list
   after going back. Clear `errorMessage` in the detail's `onDisappear`.
9. **LOW** `CategoryDetailRows.swift:67` model active switch: optimistic local value, revert on
   failure. `CategoriesViewModel.swift:81` take `categoryId` as a parameter instead of a silent
   guard. Length checks use `.utf16.count` (server counts UTF-16). Move `ActiveBadge` to
   `Views/Shared/` and use it in `LocationsManagementView`, `UsersManagementView`, `SuppliersView`
   where they hand-write "Faol/Nofaol". One shared `formSheet(title:canSave:isSaving:save:)`
   modifier in `Views/Shared/FormHelpers.swift` for the three sheets' toolbar/detents/error block.

Done when the brief's `xcodebuild` command reports BUILD SUCCEEDED with zero Swift warnings, files
≤ 300 lines, bodies ≤ 50 lines. Report items done by number, deviations, final build line.
