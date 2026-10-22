# F06: Operations — transfers, stock count, expenses, audit log — API contract

Same conventions as before: prefix `/api`, `session` cookie, errors `{ statusCode, message, error }`, money as decimal strings, lists paginated `Page<T>`. Independent of sales (F05) and consignment (F07), so it is built in parallel in its own worktree.

## Permissions (no new ones)
- `transfer_stock` (Staff + Admin): create transfers. `view_stock`: read transfers.
- `stock_count` (Staff + Admin): stock counts.
- `manage_expenses` (Admin): income and expense ledger.
- `view_audit_log` (Admin): audit log.

## Types
```ts
type ItemBrief = { id: number; identifiers: ItemIdentifier[]; productModel: { id: number; name: string }; status: ItemStatus; location: { id: number; name: string } };
type UserBrief = { id: number; name: string };

type TransferSummary = { id: number; date: string; fromLocation: { id: number; name: string }; toLocation: { id: number; name: string }; user: UserBrief; itemCount: number; accessoryUnits: number; note: string | null };
type TransferAccessory = { productModel: { id: number; name: string }; quantity: number };
type Transfer = TransferSummary & { items: ItemBrief[]; accessories: TransferAccessory[] };

type ScanStatus = 'FOUND' | 'UNKNOWN' | 'WRONG_LOCATION' | 'DUPLICATE';
type StockCountScan = { id: number; code: string; status: ScanStatus; item: ItemBrief | null; scannedAt: string };
type StockCountSummary = { id: number; location: { id: number; name: string }; user: UserBrief; startedAt: string; finishedAt: string | null; scannedCount: number };
type StockCount = StockCountSummary & {
  result: { expectedCount: number; found: number; missing: ItemBrief[]; wrongLocation: ItemBrief[]; unknown: { code: string; scannedAt: string }[] };
};

type LedgerType = 'INCOME' | 'EXPENSE';
type LedgerEntry = { id: number; type: LedgerType; category: string; amount: string; date: string; note: string | null; countsInProfit: boolean; user: UserBrief }; // countsInProfit: Admin's confirmation that this INCOME adds to net profit (BR-5); always false for EXPENSE
type LedgerPage = Page<LedgerEntry> & { totals: { income: string; expense: string; net: string } }; // over the whole filter, not just the page

type AuditEntry = { id: number; createdAt: string; user: UserBrief; action: string; entity: string; entityId: number; before: unknown | null; after: unknown | null };
```

## Endpoints
| Method | Path | Permission | Body / query | Response |
| --- | --- | --- | --- | --- |
| POST | /transfers | transfer_stock | `{ fromLocationId; toLocationId; itemIds?: number[]; accessories?: { productModelId; quantity }[]; note? }` | `Transfer` (201). At least one item or accessory line. See rules |
| GET | /transfers | view_stock | `?page&pageSize&locationId&itemId&from&to` | `Page<TransferSummary>` newest first (`locationId` matches from or to) |
| GET | /transfers/:id | view_stock | – | `Transfer` |
| POST | /stock-counts | stock_count | `{ locationId }` | `StockCount` (201). 409 if that location already has an open count |
| GET | /stock-counts | stock_count | `?page&pageSize&locationId` | `Page<StockCountSummary>` newest first |
| GET | /stock-counts/:id | stock_count | – | `StockCount` with the result computed now |
| POST | /stock-counts/:id/scans | stock_count | `{ code }` | `StockCountScan` (201; 200 with `DUPLICATE` if that code was already scanned in this count). 400 if the count is finished |
| POST | /stock-counts/:id/finish | stock_count | – | `StockCount`. 400 if already finished |
| GET | /ledger | manage_expenses | `?page&pageSize&type&category&from&to` | `LedgerPage` newest first |
| POST | /ledger | manage_expenses | `{ type; category; amount; date?; note?; countsInProfit? }` | `LedgerEntry` (201). `countsInProfit` only meaningful for INCOME (default false; forced false for EXPENSE) |
| GET | /ledger/categories | manage_expenses | – | `string[]` distinct categories, sorted |
| GET | /audit-log | view_audit_log | `?page&pageSize&entity&entityId&userId&action&from&to` | `Page<AuditEntry>` newest first |

No DELETE, no edits (BR-12): a wrong ledger entry is corrected with an opposite entry; a wrong transfer is corrected with a transfer back.

## Rules
- **Transfers (FR-5, W6)**: `from ≠ to`, both active; `itemIds` non-empty, no duplicates, max 500; every item must be `IN_STOCK` at `fromLocationId` (400 naming the first item that is not). In one transaction: set each item's `locationId` to `toLocationId` (status stays `IN_STOCK`, no "in transit"), create `Transfer` + `TransferItem`s, one audit row for the transfer with the item ids and accessory lines. **Accessories (client decision)**: each `{ productModelId, quantity }` needs `AccessoryStock(productModelId, fromLocationId).quantity ≥ quantity` (400 naming the model otherwise); the source row loses `quantity`, the target row (created if missing) gains it and its `avgCost` is re-averaged with the source's `avgCost` as the unit cost (same formula as a restock); the source `avgCost` is unchanged. Stored in a new `TransferAccessory` table.
- **Stock count (FR-6, W7)**: a count is for one location and stays open until `finish`. A scan normalizes the code (trim, upper-case) and looks up `ItemIdentifier`: found and the item is `IN_STOCK` at this location → `FOUND`; found but elsewhere or not in stock → `WRONG_LOCATION` (still stored with `itemId`); not found → `UNKNOWN` (stored with `itemId` null). The same code twice → `DUPLICATE`, not stored twice. `result` is computed on read against the **current** items: `expected` = items `IN_STOCK` at that location; `missing` = expected not scanned; `wrongLocation` = scanned items not in expected; `unknown` = scans without item. A finished count read later can drift as stock moves; that is accepted (`ponytail:` note in code).
- **Ledger (FR-27)**: `category` 1–50 chars, trimmed; `amount` > 0 (`MONEY_REGEX`); `date` defaults to now, not in the future. `totals` are sums over everything matching the filter (not just the page). Sales income is **not** entered here; it comes from sales (F05). The profit report (F07) subtracts ledger expenses and adds INCOME entries whose `countsInProfit` is true (BR-5 amended: Admin confirms which other income, e.g. repair fees, counts).
- **Audit log (FR-30)**: read-only; filters are exact matches; `before`/`after` returned as stored (cost data inside is fine: Admin only).
- Every write is audited in the same transaction. `from`/`to` are ISO dates, `to` inclusive.

## Client decisions
- Transfers move devices and accessory quantities.
- Other income counts in net profit only when Admin ticks `countsInProfit` on the entry.
