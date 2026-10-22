You are the frontend developer of the BLACKSTORE project. Work ONLY in `client/`. Read `GEMINI.md` (or `AGENTS.md`), `docs/rules/frontend.md` and `.claude/agents/frontend-developer.md` first and follow every rule in them (Feature-Sliced Design, TanStack Query + axios + custom hooks, Zustand, shadcn/ui + Tailwind, max 300 lines per file, max 50 lines per function, YAGNI, KISS, DRY, every text translated to Uzbek and Russian). Do not touch `server/` or `docs/`. Use `pnpm` in `client/`. If the API contract does not fit, build to the contract and report the mismatch at the end.

**Prerequisite:** F01 and F02 are built (`shared/api`, `shared/config/permissions.ts`, `shared/lib/formatMoney`, `features/auth` store with `hasPermission`, `widgets/app-shell`, `entities/{location,category,product-model,investor}` hooks, i18n `uz`/`ru`). Reuse all of it; do not rebuild.

# F03: Items — devices, identifiers, scan, accessory stock
PRD: FR-1, FR-2, FR-3, FR-4, FR-12, FR-13, FR-29. API: `docs/handoffs/F03-API-contract.md` (read it fully first). No new permissions.

## Build
1. **Entities** (types + TanStack Query hooks in `api/`, query keys per entity, invalidate on mutation):
   - `entities/item`: `Item`, `ItemWithCost`, `ItemIdentifier`, `ItemStatus`, `ItemCondition` types; `useItems(filters, page)`, `useItem(id)`, `useItemByCode()` (a mutation-style lookup used by the scan field), `useCreateItem()`, `useUpdateItem()`, `useUpdateItemPrices()`, `useAddIdentifier()`. Also `ItemStatusBadge` (colour per status) and `ItemConditionBadge` in `entities/item/ui`.
   - `entities/accessory-stock`: `useAccessoryStock(filters, page)`, `useAddAccessoryStock()`.
2. **features/scan**: `ScanField` (an input that submits on Enter, calls `useItemByCode`, navigates to `/items/:id`, shows a toast `scan.notFound` on 404, then clears itself; the USB scanner types the code and sends Enter) and `CameraScanButton`: rendered only when `'BarcodeDetector' in window`; opens a shadcn dialog with a `<video>` from `getUserMedia({ video: { facingMode: 'environment' } })`, runs `detect()` every 300 ms, on the first result puts the value into the scan field, stops the stream and closes. No scanning library. Put the `ScanField` in the app-shell header for every logged-in user (`view_stock`).
3. **features/manage-items**:
   - `ItemFormDialog` (create): category select → product model select (filtered by category, serialized categories only), owner select (`useInvestors()`), location select, condition select, dynamic attribute fields built from the category's `attributes` (TEXT → input, NUMBER → number input, SELECT → select; `required` enforced in the form), identifiers: IMEI, second IMEI (optional) and serial inputs (at least one required; IMEI 15 digits). Price fields (purchase, sale, minimum) only when `hasPermission('manage_prices')`. API errors (409 duplicate identifier with the item number, 400) shown in the form.
   - `ItemEditDialog`: condition + attributes.
   - `ItemPricesDialog` (`manage_prices`): purchase, sale, minimum price; purchase price field only shown with `view_cost`.
   - `AddIdentifierDialog`: type + value.
4. **features/manage-accessory-stock**: `AccessoryStockFormDialog`: category (non-serialized only) → model, location, quantity, unit cost (only with `manage_prices`).
5. **Pages** (gated by `ProtectedRoute` with `view_stock`; add nav items "Items" and "Accessories" to `widgets/app-shell`):
   - `/items`: filters row (status, location, category, owner, search box), table: model, category, identifiers (IMEI or serial), owner, location, status badge, condition, sale price, min price, **cost only with `view_cost`**; pagination; "Add item" (`receive_batch`).
   - `/items/:id`: cards: device (model, category, attributes, condition, identifiers list + "Add identifier"), owner and location, prices (sale, min; purchase and cost only with `view_cost`; "Edit prices" with `manage_prices`), status badge. "Edit" (`receive_batch`; for items in DEBT, SOLD, RETURNED or DEFECTIVE show it only with `edit_past_records`).
   - `/accessories`: filters (location, category), table: model, category, location, quantity, average cost only with `view_cost`; "Add stock" (`receive_batch`).
6. Money fields are strings: display with `formatMoney`, send back as typed. Never convert to float for storage.
7. **Staff must never see cost**: do not render `purchasePrice`, `extraCost`, `cost`, `avgCost` unless `hasPermission('view_cost')` (the API omits them anyway, but the columns must not appear empty either).

## Before you finish
- `pnpm build` and `pnpm lint` in `client/` pass; `uz.json` and `ru.json` have identical keys.
- No file over 300 lines, no function over 50 (`wc -l`).
- Report in under 30 lines: what you built, files changed, dependencies added and why (none expected), anything skipped, any contract mismatch.
