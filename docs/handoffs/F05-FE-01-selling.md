You are the frontend developer of the BLACKSTORE project. **Work in the worktree `.worktrees/F05-FE-01` (branch `task/F05-FE-01`), ONLY in its `client/` folder**; run `pnpm` from `.worktrees/F05-FE-01/client`. Read `GEMINI.md` (or `AGENTS.md`), `docs/rules/frontend.md` and `.claude/agents/frontend-developer.md` first and follow every rule in them (Feature-Sliced Design, TanStack Query + axios + custom hooks, Zustand, shadcn/ui + Tailwind, max 300 lines per file, max 50 lines per function, YAGNI, KISS, DRY, every text translated to Uzbek and Russian). Do not touch `server/` or `docs/`. Do not commit. **The backend for F05 is being built at the same time to exactly `docs/handoffs/F05-API-contract.md`; build to the contract and report any place where it does not fit.** No new dependencies.

**Reuse (already built):** `shared/api` (`getApiErrorMessage`, `getApiErrorStatus`), `shared/ui` (`SelectField`, `FormError`, `DialogFormFooter`, `TablePagination`, `TableRows`, `BackLink`, `ActiveToggleButton`), `shared/lib` (`formatMoney`, `useCreateOrUpdate`), `shared/types/Page`, `entities/session` (`useAuthStore((s) => s.hasPermission)`), `entities/{location,item,accessory-stock,product-model,category}` (`useLocations`, `useItemByCode`, `useAccessoryStock`, `ItemStatusBadge`, `SCAN_CODE_REGEX`), `features/scan` (`ScanField`, `CameraScanButton`), `widgets/app-shell`, i18n uz/ru. Do not touch `features/manage-items`, `pages/items`, `pages/accessories` (another developer is moving pieces there). **Step 0:** move `CameraScanButton` and its hook from `features/scan` to `shared/ui/CameraScanButton.tsx` and `shared/lib/useCameraBarcodeScanner.ts` (features must not import each other), and leave a one-line re-export in `features/scan/index.ts` so existing imports keep working. Build must pass before you continue.

# F05 frontend: sell, debts, customers, returns, receipts
PRD: FR-19, FR-20, FR-21, FR-22, FR-23, FR-24, FR-29; W2, W3. API: `docs/handoffs/F05-API-contract.md` (read it fully first; item shapes in `F03-API-contract.md`). No new permissions.

## Build
1. **Entities**: `entities/customer` (`Customer`, `CustomerDetail`; `useCustomers(search, page)`, `useCustomer(id)`, `useCreateCustomer()`, `useUpdateCustomer()`), `entities/sale` (`Sale`, `SaleSummary`, `SaleItem`, `SalePayment`, `SaleReturn`, `SaleStatus`, `PaymentMethod` types; `useSales(filters, page)`, `useSale(id)`, `useCreateSale()`, `useAddSalePayment()`, `useCreateSaleReturn()`; mutations invalidate sales, the sale detail, items, accessory stock and customers using plain key prefixes like `['customers']`, not by importing another entity's key object), `entities/receipt-settings` (`useReceiptSettings()`, `useUpdateReceiptSettings()`). `SaleStatusBadge` in `entities/sale/ui`.
2. **features/sell** (`sell`, W2): the sell screen as one page, not a dialog:
   - location select (remember the last choice in `localStorage`, wrapped in try/catch);
   - its own scan input with focus (do not reuse `ScanField`: it navigates to the item page) plus `CameraScanButton` from `shared/ui`: Enter → `useItemByCode` (validate with `SCAN_CODE_REGEX`) → adds a device line (model, code, owner name, minimum price shown, price input prefilled with `salePrice` or empty); an item not `IN_STOCK` or at another location shows a toast and is not added; no duplicates;
   - "Add accessory" row: model (non-serialized) + quantity + price;
   - a price below `minSalePrice` is marked red and the Save button is disabled unless the user has `manage_prices` (FR-20; the server checks too);
   - total; payment: method cash/card, amount (default = total); when amount < total the sale is a debt: customer picker becomes required (search existing by name/phone or "New customer" inline: name + phone), optional due date;
   - warranty end date per device line (optional, FR-22);
   - Save → `useCreateSale` → go to `/sales/:id`; API errors in a `FormError`.
3. **features/record-payment** (`record_payment`, W3): `PaymentDialog` (amount default = balance, method).
4. **features/return-sale** (`sell`): `ReturnDialog` for one line: quantity (accessories), refund amount (default = line price × qty, max per contract), result back-to-stock / defective, reason. Show the cash to hand back: `refund − debt it cancels` (compute from the sale's balance).
5. **features/print-receipt** (FR-24): `ReceiptPage` at `/sales/:id/receipt` (no app shell): shop header from `useReceiptSettings`, sale number, date, seller, customer, lines (model, code, qty, price, warranty until), total, paid, balance, footer; `window.print()` on load with a print stylesheet. A "Receipt" button on the sale page opens it.
6. **features/receipt-settings** (`manage_catalog`): a small form (shop name, address, phone, footer).
7. **Pages** (nav: "Sell" (`sell`), "Sales" (`sell`), "Customers" (`sell`); "Receipt settings" under the existing admin area (`manage_catalog`)):
   - `/sell`: the sell screen.
   - `/sales`: filters (status, location, customer, dates), table date, number, customer, location, seller, items, total, paid, balance, status badge. A "Debts" quick filter (status = DEBT).
   - `/sales/:id`: header (status, date, seller, location, customer with link), lines table (model, code, qty, price, warranty, returned), payments table + "Add payment" (only while DEBT), returns table + "Return" per line (while something is left to return), "Receipt" button. Cost columns never rendered (the API omits them for staff; do not render `unitCost` even for admins in F05: reports come later).
   - `/customers`: search box, table name, phone, note; "Add customer". `/customers/:id`: contact card with edit, debt card, their sales table (`useSales({ customerId })`: date, number, total, paid, balance, status) where each row links to `/sales/:id` (the lines with warranty dates are shown there, FR-22) and every DEBT row has a "Pay" button opening `PaymentDialog` (W3: Staff open the customer and record a payment).
   - `/settings/receipt`: the settings form.
8. Money through `formatMoney`, sent as typed strings; dates through `shared/lib/formatDate` (add it if missing). Staff never see cost or profit: F05 pages render only prices, payments and balances.

## Before you finish
- `pnpm build` and `pnpm lint` pass; `uz.json` and `ru.json` have identical keys.
- No file over 300 lines, no function over 50 (count them).
- Report in under 30 lines: what you built, files changed, anything skipped, any contract mismatch or place where you had to guess.
