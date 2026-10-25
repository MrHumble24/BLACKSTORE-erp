# UI-07 — iOS: category detail with attributes and models, exactly like the web

Worktree `.worktrees/UI-07`, branch `task/UI-07`. iOS app under `mobile/BlackStore-ERP/BlackStore-ERP/`.
Do not commit. Do not touch the Xcode project (folder-synchronised target). PRD items: FR-3 (categories
and dynamic attributes), FR-4 (product models), gated by `manage_catalog`.

## Reference: the web implementation (mirror it, same fields, same rules, same wording in Uzbek)

- `client/src/pages/categories/ui/CategoriesPage.tsx`, `CategoriesTable.tsx`: the list.
- `client/src/pages/categories/ui/CategoryDetailPage.tsx`, `AttributesTable.tsx`, `CategoryModelsTable.tsx`: the detail page.
- `client/src/features/manage-categories/ui/CategoryFormFields.tsx`, `AttributeFormFields.tsx`,
  `model/category.schema.ts` (validation), `lib/slugifyKey.ts` (key auto-generated from label, with
  Cyrillic transliteration; the user may override it).
- `client/src/features/manage-product-models/` (model form: name, low-stock threshold).
- `client/src/entities/category/model/types.ts` and `entities/product-model` for the shapes.
- Uzbek strings: `client/src/locales/uz.json` keys `categories.*`, `productModels.*`, `common.*`.

## API (server/src/categories, server/src/product-models)

| Call | Body | Returns |
| --- | --- | --- |
| `GET /categories?all=true` | | `[Category]` with `attributes: [CategoryAttribute]`, `isSerialized`, `isActive` |
| `POST /categories` | `{name, isSerialized?}` | `Category` |
| `PATCH /categories/:id` | `{name?, isSerialized?, isActive?}` | `Category` |
| `POST /categories/:id/attributes` | `{key, label, type: "TEXT"\|"NUMBER"\|"SELECT", options?: [String], required?, sortOrder?}` | `CategoryAttribute` |
| `PATCH /categories/:id/attributes/:attrId` | same fields, all optional | `CategoryAttribute` |
| `GET /product-models?categoryId=N&all=true` | | `[ProductModel {id, name, categoryId, isActive, lowStockThreshold?}]` |
| `POST /product-models` | `{categoryId, name, lowStockThreshold?}` | `ProductModel` |
| `PATCH /product-models/:id` | `{name?, isActive?, lowStockThreshold?}` | `ProductModel` |

Rules the server enforces (show them before submitting, like the web schema): key `^[a-z][a-z0-9_]*$`
max 50; label 1–100; options required and non-empty for SELECT (max 50 items, each ≤ 50 chars), must be
empty for other types; sortOrder integer ≥ 0; name 1–100.

## What to build

1. **Models** (`Models/Category.swift`, and the product model type where it lives): `CategoryItem` gains
   `attributes: [CategoryAttribute]` (default empty when missing) and the attribute type; add the
   payload types above. Remove the fake `code` / `icon` fields and the "Kod" text field in the create
   sheet; the web has no code. Keep the SF Symbol icon by name as a small display helper.
2. **View model**: `CatalogViewModel` (or a new `CategoryDetailViewModel`) with `fetchCategories(all:)`,
   `updateCategory`, `createAttribute`, `updateAttribute`, `fetchModels(categoryId:)`, `createModel`,
   `updateModel` (`isActive` toggle included). Errors go to `errorMessage`.
3. **List** (`Views/CategoriesManagementView.swift`): rows are `NavigationLink`s to the detail; each row
   shows name, "Seriyali" / "Seriyasiz" note, an active/inactive badge and the attribute count, same
   as the web table. "+" opens the create sheet (name + serialized switch, with the help text).
4. **Detail** (`Views/Catalog/CategoryDetailView.swift` + subviews under `Views/Catalog/`):
   - Header: name, active/inactive badge, serialized note, "Tahrirlash" (edit sheet: name, serialized
     switch, active toggle).
   - Section "Xususiyatlar" with "Qo'shish": one row per attribute showing label, key (monospaced),
     type, options joined by ", " or "—", required mark, order; tap to edit. Add and edit are disabled
     while the category is inactive, like the web.
   - Section "Modellar" with "Qo'shish": one row per model with name, active badge and an active
     toggle; tap to edit (name, low-stock threshold).
   - Attribute form sheet: label first, key auto-derived from label (port `slugifyKey.ts`) until the
     user edits it, type picker, options field only for SELECT (comma-separated, with the help text),
     required toggle, order number field, validation messages inline, Save disabled until valid.
   - Model form sheet: name, low-stock threshold (optional integer, "0 yoki bo'sh = ogohlantirish yo'q").
5. After every save, refresh and show the change; use `HapticManager` on save and error.

## Design rules

Follow `docs/handoffs/UI-01-04-ios-polish.md` (Apple HIG, inset grouped lists, semantic colours,
loading/empty/error states, sheets with detents and drag indicator, Cancel leading / Save trailing,
44 pt targets, accessibility labels). Reuse `Views/Shared/` helpers (`ErrorState`, `LoadingState`,
`InlineMessage`, `StatusBadge`, `keyboardDoneBar`, `BottomBar`). Files ≤ 300 lines, bodies ≤ 50 lines,
one-line doc comment per type. Swift 6 warnings stay at zero.

## Done when

From `mobile/BlackStore-ERP`:
`xcodebuild -project BlackStore-ERP.xcodeproj -scheme BlackStore-ERP -destination 'generic/platform=iOS Simulator' -configuration Debug CODE_SIGNING_ALLOWED=NO -derivedDataPath /tmp/dd-UI-07 build`
prints BUILD SUCCEEDED with zero Swift warnings. Report: files added/changed, what each screen does, any
place where the iOS version differs from the web and why, and the build line.
