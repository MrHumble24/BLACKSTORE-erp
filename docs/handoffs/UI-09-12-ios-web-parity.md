# UI-09..12 — iOS: web parity features (four parallel tasks)

Four tasks, each in its own worktree (`.worktrees/UI-NN`, branch `task/UI-NN`), iOS app under
`mobile/BlackStore-ERP/BlackStore-ERP/`. Do not commit. Do not touch the Xcode project.

## Non-overlap rule (strict)

Each task creates **only new files** in the folders named for it, and edits **nothing** that exists
(no shared Views, Models, ViewModels, Services, ProfileView, BatchDetailView, Item.swift...). If an
existing type lacks a field, define a new type in the task's own `Models/<Task>.swift` and decode
that. Each task exposes one public entry view with a documented `init`; the allocator wires it into
menus and toolbars afterwards (UI-13). Reuse `Views/Shared/*` (ErrorState, LoadingState,
InlineMessage, StatusBadge, MessagePanel, BottomBar, PrimaryButton, ScannerSheet, keyboardDoneBar,
decimalCommaFix, formSheet, ActiveBadge) and `APIClient.shared.get/post/patch` as they are.

## Shared rules

Mirror the web screens (`client/src/...`, Uzbek strings from `client/src/locales/uz.json`) and the
design brief `docs/handoffs/UI-01-04-ios-polish.md`. Staff never see cost, purchase price or profit
unless `currentUser.hasPermission("view_cost")`; price edits need `manage_prices`; receiving needs
`receive_batch` (check `AuthViewModel`/`User.hasPermission` usage in `Views/ProfileView.swift`).
Files ≤ 300 lines, bodies/functions ≤ 50 lines, one-line doc comment per type, zero Swift warnings.
Done when, from `mobile/BlackStore-ERP`:
`xcodebuild -project BlackStore-ERP.xcodeproj -scheme BlackStore-ERP -destination 'generic/platform=iOS Simulator' -configuration Debug CODE_SIGNING_ALLOWED=NO -derivedDataPath /tmp/dd-UI-NN build`
prints BUILD SUCCEEDED. Report: files added, entry view name and init, what each screen does,
differences from the web and why, build line.

---

## UI-09 Bulk add devices (web `/items/bulk-add`, F19)

Folders: `Views/BulkAdd/`, `ViewModels/BulkAddViewModel.swift`, `Models/BulkAdd.swift`.
Web reference: `client/src/pages/items/BulkAddPage.tsx` (or wherever `BulkAddPage` lives under
`client/src/pages/items/`), `client/src/features/bulk-add-items/**` (settings, schema, store,
scan hook, added list, price fields, codes toggle).
API: each device is one `POST /items` with
`{productModelId, investorId, locationId, condition?, attributes?, identifiers: [{type: "IMEI"|"SERIAL"|..., value}], purchasePrice?, salePrice?, minSalePrice?}`
(see `server/src/items/dto/create-item.dto.ts` and `create-identifier.dto.ts`), permission
`receive_batch`. Pick-lists: `GET /product-models?all=false`, `GET /investors`, `GET /locations`
(check how existing view models call them and copy the paths).
Build: a settings section (category → model, owner investor, location, condition, prices; purchase
price only with `view_cost`), a large text area where the user pastes many IMEI/serial codes (one
per line, also comma or space separated), a camera button using `ScannerSheet` that appends codes,
a dedup + validation step (same rules as the web schema), then "Qo'shish" that posts them one by
one with a progress count, and a result list (added / failed with the server message). Entry view:
`BulkAddView()`.

## UI-10 Device page (web `/items/:id`)

Folders: `Views/Items/`, `ViewModels/ItemDetailViewModel.swift`, `Models/ItemDetail.swift`.
Web reference: `client/src/pages/items/ItemDetailsPage.tsx` and its cards (`ItemDeviceInfoCard`,
`ItemIdentifiersCard`, `ItemOwnershipCard`, `ItemPricingCard`, `ItemTransfersCard`,
`ItemSpecsBadges`), `client/src/features/manage-items/**`, `client/src/entities/item/**`.
API (`server/src/items/items.controller.ts`): `GET /items/:id` (view_stock), `PATCH /items/:id`
`{condition?, attributes?}` (receive_batch), `PATCH /items/:id/prices`
`{purchasePrice?, salePrice?, minSalePrice?}` (manage_prices; purchasePrice only shown/edited with
view_cost), `POST /items/:id/identifiers` `{type, value}` (receive_batch),
`POST /items/:id/system-code` (receive_batch, generates the shop's own code).
Build: `ItemDetailView(itemId: Int)` with the same cards as the web: device info (model, category,
status, condition, location, specs as badges, attribute editing per the category's attributes),
identifiers (list, add, generate system code), ownership (investor, batch, dates; never cost for
staff), pricing (sale and min price edit; purchase price only with view_cost), transfers history.
Edit sheets use `formSheet`.

## UI-11 Accessories stock (web `/accessories`, FR-4)

Folders: `Views/Accessories/`, `ViewModels/AccessoryStockAdminViewModel.swift`,
`Models/AccessoryStockAdmin.swift`.
Web reference: `client/src/pages/accessories/**`, `client/src/features/manage-accessory-stock/**`,
`client/src/entities/accessory-stock/**`, `client/src/features/manage-product-models/**`.
API: `GET /accessory-stock?locationId=&categoryId=&stockLevel=` (view_stock; response shape in
`server/src/accessory-stock/accessory-stock.service.ts`), `POST /accessory-stock`
`{productModelId, locationId, quantity, unitCost?}` (receive_batch; unitCost only with view_cost),
new accessory names are product models: `POST /product-models` `{categoryId, name, lowStockThreshold?}`
(manage_catalog), categories from `GET /categories` (non-serialized ones are accessory categories).
Build: `AccessoriesView()`: list grouped like the web (name, category, location, quantity, low-stock
mark), filters (location, category, stock level), "Qo'shish" sheet to add stock to a model at a
location, and "Yangi aksessuar" sheet to create a model (only with manage_catalog).

## UI-12 Batch labels (web `/batch-labels`, `/label`, FR-15)

Folders: `Views/Labels/`, `Models/Labels.swift` (if needed).
Web reference: `client/src/features/print-label/**` (`label.ts` model, `Code128Barcode.tsx`,
`LabelPage.tsx`, `BatchLabelsPage.tsx`, `BatchLabelsButton.tsx`). Existing iOS single-label code:
`Views/BarcodePrintSheet.swift` (read it; do not edit it; you may copy its barcode drawing into
`Views/Labels/` if its helpers are private).
API: `GET /batches/:id` (items with identifiers and prices; see `Models/Batch.swift` `BatchDetail`
for what is decoded, define your own type in `Models/Labels.swift` if you need more).
Build: `BatchLabelsSheet(batchId: Int)`: renders one label per device exactly like the web label
(model name, price, system code or IMEI as Code 128 barcode and text), laid out on A4/Letter pages
with the web's label size, with a page preview, "Chop etish" via `UIPrintInteractionController`
(AirPrint) and "Ulashish" as PDF via `ShareLink`. Devices without a price or code get a visible
warning line instead of a label, like the web.
