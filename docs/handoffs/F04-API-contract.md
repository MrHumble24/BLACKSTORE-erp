# F04: Buying — suppliers, batches, walk-in purchases, labels — API contract

Same conventions as `F01-API-contract.md`: prefix `/api`, `session` cookie, errors `{ statusCode, message, error }`, 400 validation, 401 not logged in, 403 no permission, 404 not found, 409 duplicate. Money is a decimal string, never a float. Lists are paginated `Page<T>` unless marked as a pick-list. Cost keys (`unitPrice`, `extraCost`, `cost`, `itemsCost`, `extraCostTotal`, `balance`, `purchasePrice`) are **absent** without `view_cost`.

Stock import from Excel (FR-7) is a separate later handoff, not part of F04.

## Permissions (no new ones)
- `receive_batch` (Staff + Admin): create batches, add devices and accessories to a batch, generate a label code.
- `manage_prices` (Admin): unit prices, extra costs and the split method.
- `manage_suppliers` (Admin): suppliers, supplier detail with balance, payments.
- `buy_walk_in` (Staff + Admin): walk-in purchases. Staff may **enter** the price paid (they hand over the cash) but never see it afterwards.
- `view_cost` (Admin): cost keys in responses.

## Types
```ts
type SupplierSummary = { id: number; name: string; country: string | null; isActive: boolean }; // pick-list
type Supplier = SupplierSummary & { phone: string | null; note: string | null; balance: string }; // manage_suppliers; balance per BR-8
type SupplierPayment = { id: number; amount: string; fee: string; date: string; note: string | null };

type CostSplitMethod = 'NONE' | 'EQUAL' | 'BY_PRICE';
type BatchSummary = {
  id: number;
  supplier: { id: number; name: string };
  investor: { id: number; name: string; code: string; isOwn: boolean };
  location: { id: number; name: string };
  arrivalDate: string;
  note: string | null;
  deviceCount: number;      // device lines
  accessoryUnits: number;   // sum of accessory line quantities
  costSplitMethod: CostSplitMethod;
  extraCostTotal?: string;  // view_cost
  itemsCost?: string;       // view_cost: Σ unitPrice × quantity over all lines
};
type BatchLine = {
  id: number;
  quantity: number;
  item: { id: number; status: ItemStatus; identifiers: ItemIdentifier[] } | null; // device line
  productModel: { id: number; name: string; category: { id: number; name: string } };
  unitPrice?: string;       // view_cost
  extraCost?: string;       // view_cost, per unit
};
type Batch = BatchSummary & { lines: BatchLine[] }; // lines ordered by id

type WalkInSeller = { id: number; name: string; phone: string };
// Item, ItemIdentifier, ItemStatus, AccessoryStock: see F03-API-contract.md
```

## Endpoints
| Method | Path | Permission | Body / query | Response |
| --- | --- | --- | --- | --- |
| GET | /suppliers | logged in | `?all=true` | `SupplierSummary[]` (pick-list, active only unless `all`) |
| GET | /suppliers/:id | manage_suppliers | – | `Supplier` |
| POST | /suppliers | manage_suppliers | `{ name; country?; phone?; note? }` | `Supplier` (201). 409 if name exists |
| PATCH | /suppliers/:id | manage_suppliers | `{ name?; country?; phone?; note?; isActive? }` | `Supplier` |
| GET | /suppliers/:id/payments | manage_suppliers | `?page&pageSize` | `Page<SupplierPayment>` newest first |
| POST | /suppliers/:id/payments | manage_suppliers | `{ amount; fee?; date?; note? }` | `SupplierPayment` (201). No edit or delete: a wrong payment is fixed with a correcting entry, so `amount` may be negative (never 0); `fee` ≥ 0 |
| GET | /batches | receive_batch | `?page&pageSize&supplierId` | `Page<BatchSummary>` newest first |
| GET | /batches/:id | receive_batch | – | `Batch` |
| POST | /batches | receive_batch | `{ supplierId; investorId; locationId; arrivalDate?; note? }` | `BatchSummary` (201). Supplier, investor and location must be active |
| PATCH | /batches/:id | receive_batch | `{ arrivalDate?; note?; extraCostTotal?; costSplitMethod? }` | `Batch`. `extraCostTotal` / `costSplitMethod` need `manage_prices` (403 otherwise); changing them re-splits extra costs over the lines |
| POST | /batches/:id/items | receive_batch | `{ productModelId; identifiers; condition?; attributes?; purchasePrice? }` | `Item` (201). Owner = batch investor, location = batch location (FR-8). Same rules and 409 as `POST /items`. `purchasePrice` needs `manage_prices` (403 if sent without it); when omitted the line is saved at `0` and Admin prices it later (W1 step 4) |
| POST | /batches/:id/accessories | receive_batch | `{ productModelId; quantity; unitCost? }` | `AccessoryStock` (201). Same rules as `POST /accessory-stock`; the purchase line belongs to the batch |
| PATCH | /batches/:id/lines/:lineId | manage_prices | `{ unitPrice }` | `BatchLine` |
| POST | /walk-in-purchases | buy_walk_in | `{ seller: { name; phone }; productModelId; locationId; investorId?; identifiers; condition; attributes?; pricePaid }` | `Item` (201). `investorId` defaults to the business (`isOwn`). Known identifier: if that item is `SOLD` → buy-back (see rules); any other status → 409 `IMEI 3561… already belongs to item #42 (IN_STOCK)` |
| POST | /items/:id/system-code | receive_batch | – | `ItemIdentifier` (201, or 200 if the item already has one). Value `BS-` + item id zero-padded to 6 digits, e.g. `BS-000042` (FR-15). On a DEBT/SOLD/RETURNED/DEFECTIVE item it needs `edit_past_records`, like adding any identifier (F03) |

No DELETE anywhere (BR-12). Deactivate suppliers instead.

## Rules
- **Supplier balance (BR-8, FR-17)** = Σ over the supplier's batch lines of `unitPrice × quantity` − Σ `payments.amount`. The transfer `fee` is stored but not part of the balance (it never reached the supplier). Computed on read, never stored. Until Admin prices a batch, Staff device lines count as `0` and Staff accessory lines as the current average cost, so the balance is an estimate until W1 step 4 is done.
- **Supplier name is unique** at database level (`@unique`), 409 on duplicate.
- **Batch lines** are `PurchaseLine` rows with `batchId`. Device line: `itemId` set, `quantity = 1`. Accessory line: `productModelId` set, `quantity ≥ 1`.
- **Unit price change** (`PATCH .../lines/:lineId`): device line → also sets `Item.purchasePrice`. Accessory line → adjusts the stock row: `avgCost = avgCost + (new − old) × quantity / currentQuantity` (if `currentQuantity` is 0, leave `avgCost`). Then re-split extra costs.
- **Extra costs (FR-18, BR-1)**: `costSplitMethod` defaults to `NONE` and `extraCostTotal` to `0`. Split is over **device lines only** (accessories are excluded; their cost is the average of unit prices). `EQUAL`: each device gets `extraCostTotal / deviceCount`. `BY_PRICE`: each device gets `extraCostTotal × unitPrice / Σ unitPrice` (if Σ unitPrice is 0, fall back to EQUAL). Rounded to 2 decimals; the rounding remainder goes to the last line so the parts sum to the total. `NONE`: every line gets `0`. Re-split runs whenever `extraCostTotal`, `costSplitMethod` or a device line changes, and writes `PurchaseLine.extraCost` and `Item.extraCost`. Past sales are not touched (BR-7).
- **Walk-in (FR-25, W5)**: seller is matched by phone (trimmed); an existing seller with that phone is reused and its name updated to the one typed now, otherwise created. The item is created like `POST /items` with a `PurchaseLine { walkInSellerId, unitPrice: pricePaid }`. Staff may send `pricePaid` without `manage_prices`. If an identifier already exists and the item is **not** `SOLD`, 409 with the item number and status (the frontend shows the warning). If it is `SOLD`, this is a **buy-back** (allowed by BR-9: "Sold → In stock only through a walk-in buy-back"): the same item record is reused: `status → IN_STOCK` through `changeStatus`, `investorId`, `locationId`, `condition` and `attributes` set from the request, `purchasePrice = pricePaid`, `extraCost = 0`, `salePrice`/`minSalePrice` cleared, a new `PurchaseLine { itemId, walkInSellerId, unitPrice: pricePaid }` added (purchase history keeps the old lines), the request's `productModelId` must equal the item's model (400 otherwise), new identifiers in the request are added if missing. The old sale is untouched (BR-7).
- **Labels (FR-15)**: the system code is derived from the item id, so it is unique by construction and needs no counter. Printing is a frontend page; the backend only guarantees the code.
- `arrivalDate` and payment `date` default to now, ISO strings, not in the future.
- Every write is audited in the same transaction.

## Client decisions
- Staff may generate label codes at receiving time (FR-15 names Admin; Admin still can). Tell us if labels must be Admin-only.
- Buy-back of our own `SOLD` device is supported (above); allowed by PRD BR-9 (not an amendment — BR-9 already permits Sold → In stock via walk-in buy-back).
- Extra costs are split over devices only; accessories carry no share.

## F04-BE-03 changes (batch logic fixes)

Added after batch 20 showed ghost devices from glued scans. Overrides the "No DELETE anywhere" line above for one case: a batch line may be removed while nothing happened to it yet.

### Types (added fields)

```ts
interface BatchSummary { ...; isLocked: boolean; unpricedLines?: number }  // unpricedLines with view_cost only
interface Batch extends BatchSummary { ... }
```

### Endpoints

| Method | Path | Permission | Body | Response |
| --- | --- | --- | --- | --- |
| DELETE | /batches/:id/lines/:lineId | delete_records | – | 204. Device line: item must be `IN_STOCK` with no sale, consignment, transfer or stock-count record, else 409 `Device #N was already sold, handed over or moved; it cannot be removed`. The item and its identifiers are deleted. Accessory line: stock at the batch location must hold `≥ quantity`, else 409 `Only N units are left at <location>; the line cannot be removed`; quantity is decremented, `avgCost` unchanged. Re-split runs after. |
| PATCH | /batches/:id/lines | manage_prices | `{ productModelId; unitPrice }` | `Batch`. Reprices every line of that model (device lines by the item's model, accessory lines by the line's model) with the single-line rules. 404 if the batch has no line of that model. |

### Rules

- **Glued scans**: any identifier value that starts with 15 digits and is longer than 15 characters → 400 `Code looks like two scans glued together; scan again`. `SERIAL` is 4–20 chars (`SYSTEM_CODE` stays 4–40). Applies to every endpoint that takes identifiers.
- **Locked batches (FR-29)**: a batch whose `arrivalDate` is before the start of today − 3 days is locked (`isLocked: true`). `POST .../items`, `POST .../accessories`, `PATCH /batches/:id`, `PATCH .../lines`, `PATCH .../lines/:lineId` and `DELETE .../lines/:lineId` on it need `edit_past_records`; otherwise 403 `This batch is older than 3 days; editing it requires the edit_past_records permission`.
- **Split NONE with extra cost**: `PATCH /batches/:id` is refused with 400 `Choose how to split the extra cost (EQUAL or BY_PRICE) or set it to 0` when the resulting `extraCostTotal > 0` and `costSplitMethod = NONE`.
- **Accessory reprice cap**: `avgCost += (new − old) × min(lineQuantity, currentQuantity) / currentQuantity` (replaces the formula above), so a correction never moves the average by more than the price change itself.
- **Dual IMEI**: no new endpoint. The client adds the second IMEI or the serial with `POST /items/:id/identifiers` (F03); caps stay 2 IMEI + 1 SERIAL + 1 SYSTEM_CODE.
