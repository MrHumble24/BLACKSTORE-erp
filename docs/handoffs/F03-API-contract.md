# F03: Items — API contract

Devices as single records, unique identifiers, scan lookup, accessories by quantity. Same conventions as `F01-API-contract.md`: prefix `/api`, `session` cookie, errors `{ statusCode, message, error }`, 400 validation, 401 not logged in, 403 no permission, 404 not found, 409 duplicate. Money is a decimal string (`"1500.00"`), never a float. Lists are paginated `Page<T>`.

## Permissions (no new ones)
- `view_stock` (Staff + Admin): read items, accessory stock, scan.
- `receive_batch` (Staff + Admin): add items and accessory stock, edit condition/attributes, add identifiers.
- `manage_prices` (Admin): set purchase, sale and minimum price.
- `view_cost` (Admin): cost fields appear in responses. Without it the keys `purchasePrice`, `extraCost`, `cost`, `avgCost` are **absent**, not null.

## Types
```ts
type ItemStatus = 'IN_STOCK' | 'AT_PARTNER' | 'DEBT' | 'SOLD' | 'RETURNED' | 'DEFECTIVE';
type ItemCondition = 'NEW' | 'USED' | 'REFURBISHED';
type IdentifierType = 'IMEI' | 'SERIAL' | 'SYSTEM_CODE';
type ItemIdentifier = { id: number; type: IdentifierType; value: string };

type Item = {
  id: number;
  productModel: { id: number; name: string; category: { id: number; name: string } };
  investor: { id: number; name: string; code: string; isOwn: boolean };
  location: { id: number; name: string; type: 'WAREHOUSE' | 'SHOP' };
  status: ItemStatus;
  condition: ItemCondition;
  attributes: Record<string, string | number>;   // keys = CategoryAttribute.key of the item's category
  salePrice: string | null;
  minSalePrice: string | null;                      // staff see this: W2 needs it
  identifiers: ItemIdentifier[];
  createdAt: string;
  updatedAt: string;
};
type ItemWithCost = Item & { purchasePrice: string; extraCost: string; cost: string }; // view_cost only; cost = purchasePrice + extraCost (BR-1)

type AccessoryStock = {
  id: number;
  productModel: { id: number; name: string; category: { id: number; name: string } };
  location: { id: number; name: string };
  quantity: number;
};
type AccessoryStockWithCost = AccessoryStock & { avgCost: string }; // view_cost only

type Page<T> = { items: T[]; total: number; page: number; pageSize: number };
```

## Endpoints
| Method | Path | Permission | Body / query | Response |
| --- | --- | --- | --- | --- |
| GET | /items | view_stock | `?page&pageSize&status&locationId&categoryId&investorId&search` | `Page<Item>` newest first. `search` matches an identifier value (exact, case-insensitive) or model name (contains) |
| GET | /items/:id | view_stock | – | `Item` |
| GET | /items/by-code/:code | view_stock | – | `Item` whose identifier equals `code` (trimmed, upper-cased). 404 `Item not found` if none. Used by the scan field (FR-12) |
| POST | /items | receive_batch | `{ productModelId; investorId; locationId; condition?; attributes?; identifiers: { type; value }[]; purchasePrice?; salePrice?; minSalePrice? }` | `Item` (201). Price fields need `manage_prices` (403 otherwise). 409 if an identifier exists: message `IMEI 3561… already belongs to item #42` |
| PATCH | /items/:id | receive_batch | `{ condition?; attributes? }` | `Item`. Location changes are transfers (F06), status changes come from sales/consignment/returns: not here |
| PATCH | /items/:id/prices | manage_prices | `{ purchasePrice?; salePrice?; minSalePrice? }` | `ItemWithCost` |
| POST | /items/:id/identifiers | receive_batch | `{ type; value }` | `ItemIdentifier` (201). 409 as above |
| GET | /accessory-stock | view_stock | `?page&pageSize&locationId&categoryId` | `Page<AccessoryStock>` ordered by model name |
| POST | /accessory-stock | receive_batch | `{ productModelId; locationId; quantity; unitCost? }` | `AccessoryStock` (201). Adds `quantity` to the (model, location) row, creating it if missing. `unitCost` needs `manage_prices` |

No DELETE anywhere (BR-12).

## Rules
- **Serialized vs accessories**: `POST /items` is only for models whose category `isSerialized = true`; `POST /accessory-stock` only for `isSerialized = false`. Otherwise 400 with a clear message.
- **Identifiers (FR-2)**: value is trimmed and upper-cased before save and lookup; unique across the whole system (DB unique). IMEI must be 15 digits; SERIAL and SYSTEM_CODE 4–40 chars of `A-Z 0-9 -`. An item needs at least one IMEI or SERIAL on create. An item may have two IMEIs (dual-SIM phones) but only one SERIAL and one SYSTEM_CODE.
- **Past records (FR-29)**: `PATCH /items/:id` and `POST /items/:id/identifiers` on an item whose status is DEBT, SOLD, RETURNED or DEFECTIVE need `edit_past_records` (Admin); Staff get 403.
- **Attributes (FR-3)**: validated against the category's attributes: unknown keys → 400; `required` keys must be present; `SELECT` value must be one of `options`; `NUMBER` must be a number; `TEXT` a string ≤ 200 chars. Missing optional keys are simply absent.
- **Opening stock**: `POST /items` and `POST /accessory-stock` are how stock gets in before suppliers/batches exist (F04) and how launch-day stock is entered. Each creates a `PurchaseLine` with no batch and no walk-in seller (`unitPrice` = `purchasePrice` / `unitCost`, or `0` when not given). Batches (F04) reuse the same service method.
- **Prices**: `purchasePrice` ≥ 0, `salePrice` ≥ 0, `minSalePrice` ≥ 0 and ≤ `salePrice` when both set. Decimal strings, up to 2 decimals. Changing `purchasePrice` also updates the item's latest `PurchaseLine.unitPrice` so cost history and the item agree.
- **Accessory average cost**: `avgCost = (oldQty × oldAvg + qty × unitCost) / (oldQty + qty)`, rounded to 2 decimals; when `unitCost` is absent (Staff restock) `avgCost` stays unchanged and the `PurchaseLine.unitPrice` is the current `avgCost`, so Staff cannot drag the cost down.
- **Status changes (BR-9)**: one function `changeStatus(itemId, to)` in the items service enforces the allowed moves: IN_STOCK → AT_PARTNER, DEBT, SOLD; AT_PARTNER → IN_STOCK, DEBT, SOLD; DEBT → SOLD; SOLD → RETURNED; RETURNED → IN_STOCK, DEFECTIVE. Anything else → 400. No HTTP endpoint for it in F03; later features (sales, consignment, transfers, returns) call it.
- `investorId` and `locationId` must be active records; inactive → 400.
- Every write is audited in the same transaction. Logs never contain identifiers together with customer data (there is none yet).

## Scan field (frontend)
- A scan input in the app header on every logged-in screen (FR-12). The USB scanner types the code and sends Enter → `GET /items/by-code/:code` → open `/items/:id`; 404 → toast "Item not found".
- Camera fallback (FR-13): a camera button next to the field, shown only when the browser has the built-in `BarcodeDetector` API (Chrome on Android). It fills the same field. No scanning library.
