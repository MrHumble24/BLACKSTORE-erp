# F05: Selling — sales, payments, debts, customers, returns, receipts — API contract

Same conventions as before: prefix `/api`, `session` cookie, errors `{ statusCode, message, error }`, 400/401/403/404/409, money as decimal strings, lists paginated `Page<T>`. Cost and profit keys (`unitCost`, `investor`, `shareType`, `shareValue`) are **absent** without `view_cost`. Partner-shop sales (`partnerId`) are F06, not here.

## Permissions
- `sell` (Staff + Admin): customers, create sales, returns, read sales and receipts.
- `record_payment` (Staff + Admin): payments on a debt sale.
- `manage_prices` (Admin): may sell below an item's minimum price (FR-20).
- `manage_catalog` (Admin): receipt header settings.
- `view_cost` (Admin): cost/share snapshots in sale responses.

## Types
```ts
type Customer = { id: number; name: string; phone: string; note: string | null; createdAt: string };
type CustomerDetail = Customer & { debt: string }; // Σ balance of this customer's DEBT sales (BR-8)

type PaymentMethod = 'CASH' | 'CARD';
type SaleStatus = 'DEBT' | 'PAID' | 'RETURNED';
type SaleItem = {
  id: number;
  item: { id: number; identifiers: ItemIdentifier[]; status: ItemStatus } | null; // device line
  productModel: { id: number; name: string; category: { id: number; name: string } };
  quantity: number;
  unitPrice: string;
  warrantyUntil: string | null;
  returnedQuantity: number;
  unitCost?: string;                                   // view_cost
  investor?: { id: number; name: string; code: string } | null; // view_cost
  shareType?: ShareType; shareValue?: string;          // view_cost
};
type SalePayment = { id: number; amount: string; method: PaymentMethod; date: string; receivedBy: { id: number; name: string } };
type SaleReturn = { id: number; saleItemId: number; quantity: number; refundAmount: string; result: 'BACK_TO_STOCK' | 'DEFECTIVE'; reason: string | null; date: string; user: { id: number; name: string } };
type SaleSummary = {
  id: number; createdAt: string; status: SaleStatus;
  customer: { id: number; name: string; phone: string } | null;
  location: { id: number; name: string };
  seller: { id: number; name: string };
  total: string; paid: string; refunded: string; balance: string; // balance = total − paid − refunded, never below 0 (BR-8)
  dueDate: string | null;
  itemCount: number;
};
type Sale = SaleSummary & { items: SaleItem[]; payments: SalePayment[]; returns: SaleReturn[] };
type ReceiptSettings = { shopName: string; address: string; phone: string; footer: string }; // Setting key "receipt"
```

## Endpoints
| Method | Path | Permission | Body / query | Response |
| --- | --- | --- | --- | --- |
| GET | /customers | sell | `?page&pageSize&search` (name or phone contains) | `Page<Customer>` |
| GET | /customers/:id | sell | – | `CustomerDetail` |
| POST | /customers | sell | `{ name; phone; note? }` | `Customer` (201). 409 if phone exists |
| PATCH | /customers/:id | sell | `{ name?; phone?; note? }` | `Customer` |
| GET | /sales | sell | `?page&pageSize&status&customerId&locationId&from&to` | `Page<SaleSummary>` newest first |
| GET | /sales/:id | sell | – | `Sale` |
| POST | /sales | sell | `{ locationId; lines: ({ itemId; unitPrice; warrantyUntil? } \| { productModelId; quantity; unitPrice })[]; customerId?; dueDate?; payment?: { amount; method } }` | `Sale` (201). See rules |
| POST | /sales/:id/payments | record_payment | `{ amount; method }` | `Sale`. 400 if the sale is not DEBT or `amount` > balance |
| POST | /sales/:id/returns | sell | `{ saleItemId; quantity?; refundAmount; result; reason? }` | `Sale` (201). See rules |
| GET | /settings/receipt | logged in | – | `ReceiptSettings` (empty strings until set) |
| PATCH | /settings/receipt | manage_catalog | `ReceiptSettings` (all optional) | `ReceiptSettings` |

No DELETE and no sale editing (BR-12): mistakes are fixed with a return or a payment.

## Rules
- **Sale lines (W2)**: a device line needs an item with status `IN_STOCK` at `locationId` (400 otherwise; items at a partner are sold through F06). An accessory line needs `AccessoryStock(productModelId, locationId).quantity ≥ quantity`; the sale lowers it (FR-4). A sale has at least one line.
- **Minimum price (FR-20)**: a device line with `unitPrice < item.minSalePrice` is refused with 400 `Below minimum price` unless the user has `manage_prices`. `unitPrice ≥ 0`.
- **Totals**: `total = Σ unitPrice × quantity` (no discount field: a lower price is entered per line, subject to the minimum price). `payment.amount` between 0 and `total`. `paid = total` → status `PAID`, device items → `SOLD`. Otherwise status `DEBT`, items → `DEBT`, and `customerId` is required (FR-21); `dueDate` optional, not in the past.
- **Snapshots (BR-7)** taken on each line at sale time: `unitCost` = `purchasePrice + extraCost` for devices, `avgCost` for accessories; `investorId`, `shareType`, `shareValue` copied from the item's investor (accessories: investor null, share NONE). Later changes to prices or splits never touch the sale.
- **Payments (W3, FR-21)**: only on a `DEBT` sale; `0 < amount ≤ balance`. When `balance` reaches 0 the sale becomes `PAID` and its device items move `DEBT → SOLD` (BR-9). `receivedBy` is the current user.
- **Returns (FR-23)**: allowed on `PAID` and `DEBT` sales (BR-9 amended: `Debt → Returned` as well as `Sold → Returned`). Device line: `quantity` is 1; the item goes `→ RETURNED → IN_STOCK` (back at the sale's location) or `→ DEFECTIVE`, through the status function. Accessory line: `quantity ≤ sold − already returned`; `BACK_TO_STOCK` adds it back to that location's stock, `DEFECTIVE` does not. `0 ≤ refundAmount ≤ unitPrice × quantity − refunds already made on that line`. `refunded` lowers `balance` first. Status after a return: if every quantity on the sale is returned **and** `balance` is 0 → `RETURNED`; else if `balance` is 0 → `PAID`; else the sale stays (or becomes) `DEBT` with the remaining balance, so payments stay possible and the customer's debt never silently disappears. Cash actually handed back is `refundAmount − debt it cancelled`; the frontend shows it, the server stores only `refundAmount`. Profit correction (FR-23) happens in reports (F06) by subtracting returns; the sale snapshots stay.
- **Customer debt (BR-8)** = Σ `balance` over the customer's `DEBT` sales. Computed on read.
- Device lines carry `productModel` taken from the item (`SaleItem.productModelId` is set on every line, device or accessory).
- **Receipt (FR-24)**: built by the frontend from `GET /sales/:id` + `GET /settings/receipt`; no server rendering. Warranty end date (FR-22) is per line and shows on the receipt and in the customer's sales.
- `from`/`to` are ISO dates; `to` is inclusive of that day.
- Every write is audited in the same transaction; `POST /sales` writes one audit row for the sale (lines included in `after`).

## Client decisions
- Returns are allowed on debt sales too (FR-23 says a return corrects debt); PRD BR-9 amended with `Debt → Returned`, BR-8 with `− refunds`.
- No discount field (the schema column stays at 0): the price per line is the price.
- Receipt header (shop name, address, phone, footer line) is a setting Admin edits; printing is done by the browser.
