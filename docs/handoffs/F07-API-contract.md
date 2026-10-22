# F07: Partners and finance — consignment, reports, stock import, backups — API contract

Same conventions as before: prefix `/api`, `session` cookie, errors `{ statusCode, message, error }`, money as decimal strings, lists paginated `Page<T>`, `from`/`to` ISO dates with `to` inclusive. Built as two parallel backend tasks: **F07-BE-01** (partners, consignments, reports) and **F07-BE-02** (stock import, backups). They share no module.

## Permissions
- `consign` (Staff + Admin): partners and consignments. `record_payment`: partner payments (through the existing `POST /sales/:id/payments`).
- `view_profit` (Admin): reports. `view_cost` (Admin): cost columns inside them.
- `manage_prices` (Admin): stock import (the file carries purchase prices).
- **New** `manage_backups` (Admin): backups. Add it to `src/common/permissions.ts` and the Admin role in the seed.

## Part 1 (F07-BE-01): partners, consignment, reports

### Types
```ts
type Partner = { id: number; name: string; phone: string; marketLocation: string | null; note: string | null };
type PartnerReport = Partner & { held: number; soldUnpaid: number; totalOwed: string; overdue: number }; // held = items AT_PARTNER; soldUnpaid = partner sales in DEBT; totalOwed = Σ balance of those sales; overdue = held items whose consignment dueDate < today
type ConsignmentItemStatus = 'AT_PARTNER' | 'SOLD' | 'RETURNED';
type ConsignmentItem = { id: number; item: ItemBrief; minPrice: string; status: ConsignmentItemStatus; soldAt: string | null; saleId: number | null; returnedAt: string | null; overdue: boolean };
type ConsignmentSummary = { id: number; date: string; partner: { id: number; name: string }; handedBy: UserBrief; dueDate: string | null; note: string | null; itemCount: number; heldCount: number };
type Consignment = ConsignmentSummary & { items: ConsignmentItem[] };

type ProfitLine = { kind: 'SALE' | 'RETURN'; saleId: number; saleItemId: number; returnId: number | null; profitDate: string; item: { id: number; code: string; model: string } | null; productModel: string; quantity: number; investor: { id: number; name: string } | null; location: { id: number; name: string }; category: { id: number; name: string }; salePrice: string; refunded: string; cost: string; profit: string; investorShare: string; businessShare: string };
type ProfitTotals = { sales: string; refunded: string; cost: string; profit: string; investorShare: string; businessShare: string; expenses: string; otherIncome: string; netProfit: string };
type ProfitGroup = { id: number; name: string; quantity: number; sales: string; profit: string; investorShare: string; businessShare: string };
type ProfitReport = { totals: ProfitTotals; byInvestor: ProfitGroup[]; byLocation: ProfitGroup[]; byCategory: ProfitGroup[]; lines: Page<ProfitLine> };
type InvestorReportRow = { investor: { id: number; name: string; isOwn: boolean }; itemsSold: number; sales: string; cost: string; profit: string; investorShare: string; businessShare: string };
type InvestorReport = { month: string; rows: InvestorReportRow[]; totals: Omit<InvestorReportRow, 'investor'> };
```

### Endpoints
| Method | Path | Permission | Body / query | Response |
| --- | --- | --- | --- | --- |
| GET | /partners | consign | `?page&pageSize&search` | `Page<PartnerReport>` |
| GET | /partners/:id | consign | – | `PartnerReport` |
| POST | /partners | consign | `{ name; phone; marketLocation?; note? }` | `Partner` (201) |
| PATCH | /partners/:id | consign | same, all optional | `Partner` |
| POST | /consignments | consign | `{ partnerId; items: { itemId; minPrice }[]; dueDate?; note? }` | `Consignment` (201) |
| GET | /consignments | consign | `?page&pageSize&partnerId&open` (`open=true` = has held items) | `Page<ConsignmentSummary>` newest first |
| GET | /consignments/:id | consign | – | `Consignment` |
| PATCH | /consignments/:id | consign | `{ dueDate: string \| null }` | `Consignment` |
| PATCH | /consignments/:id/items/:itemId | consign | `{ minPrice }` | `ConsignmentItem` (only while AT_PARTNER) |
| POST | /consignments/:id/items/:itemId/sell | sell | `{ paid: boolean; method?: PaymentMethod }` | `Consignment`. See rules |
| POST | /consignments/:id/items/:itemId/return | consign | – | `Consignment`. Item AT_PARTNER → IN_STOCK |
| GET | /sales | sell | add `partnerId` to the existing filters | partner sales are included only when `partnerId` is given (today they are hidden) |
| GET | /reports/profit | view_profit | `?from&to&investorId&locationId&categoryId&page&pageSize` | `ProfitReport` |
| GET | /reports/investors | view_profit | `?month=YYYY-MM&investorId` | `InvestorReport` |
| GET | /reports/investors.xlsx | view_profit | same | an `.xlsx` file (`Content-Disposition: attachment`), one row per investor plus totals, same numbers |

### Rules
- **Handover (FR-26, W4)**: every item must be `IN_STOCK` (400 naming the first that is not); duplicates → 400; max 200 items; `minPrice` > 0; `dueDate` today or later. In one transaction: each item `IN_STOCK → AT_PARTNER` through `ItemsService.changeStatus` (conditional write, like sales), create `Consignment` + `ConsignmentItem`s, one audit row. Items keep their location and owner (W4 step 2).
- **Partner reports a sale (W4 step 3)**: the consignment item must be `AT_PARTNER`. The sale price is always the item's current `minPrice` (BR-7, BR-8: partner debt = minimum prices of sold items − payments); to sell at another price, change `minPrice` first with `PATCH .../items/:itemId`. In one transaction: create a `Sale` with `partnerId`, `customerId` null, `locationId` = the item's location, `sellerId` = the user, one device line with `unitPrice = minPrice` (snapshots as in F05: reuse the F05 line builder in `sale-create.ts`, giving it an allowed-status parameter so it accepts `AT_PARTNER` here and keeps requiring `IN_STOCK` for normal sales; do not copy it), `total` = `minPrice`; `paid: true` → a `SalePayment` for the full amount (`method` default CASH), sale `PAID`, item `AT_PARTNER → SOLD`; `paid: false` → sale `DEBT`, item `AT_PARTNER → DEBT`. Set `ConsignmentItem.status = SOLD`, `soldAt`, `saleItemId`. Audit once. Later partner payments go through `POST /sales/:id/payments` unchanged; when that closes the debt the item goes `DEBT → SOLD` (F05 already does this).
- **Return from partner (W4 step 4)**: `AT_PARTNER → IN_STOCK`, `ConsignmentItem.status = RETURNED`, `returnedAt`. Audit once.
- **Overdue**: `dueDate` set, `dueDate < today`, item still `AT_PARTNER`.
- **Profit report (FR-28, BR-1 to BR-6)**: two kinds of lines. **SALE lines**: one per `SaleItem` of a sale whose status is `PAID` or `RETURNED` (BR-6: debt sales count only once paid; partner sales too); `profitDate` = the sale's last payment date, or the sale date when it has no payments (a cash sale has one payment at creation, so both are the same); `salePrice = unitPrice × quantity`, `refunded = 0`, `cost = unitCost × quantity`, `profit = salePrice − cost`. **RETURN lines** (client decision: a return is a loss in the month it happens, FR-23): one per `Return` row whose sale is `PAID` or `RETURNED`; `profitDate` = the return date; `salePrice = 0`, `refunded = refundAmount`, `cost = −(unitCost × quantity)` for `BACK_TO_STOCK` (the goods and their cost come back) and `0` for `DEFECTIVE`, `profit = −refunded − cost`. The period filter is on `profitDate` for both kinds. Investor share on each line's `profit`: investor `isOwn` or null → 0; `NONE` → all of it; `PERCENT` → `profit × shareValue / 100`; `FIXED_PER_ITEM` → `profit − shareValue × quantity` exactly as BR-4 says (the business keeps the fixed amount even when that makes the investor share negative; no floor; the client has not yet confirmed this edge, so keep the formula in one function); on RETURN lines `FIXED_PER_ITEM` → `profit` (the fixed amount was already taken on the SALE line and is not taken twice); `businessShare = profit − investorShare`. Totals: `expenses` = Σ ledger `EXPENSE` with `date` in the period; `otherIncome` = Σ ledger `INCOME` with `countsInProfit` in the period; `netProfit = profit − expenses + otherIncome` (BR-5). Groups sum the same lines by investor (null investor shown as "Accessories"), location and category. `lines` are paginated; totals and groups cover the whole filter. Money arithmetic in `Prisma.Decimal`, 2 decimals.
- **Investor report (FR-11)**: the same lines for the month (`profitDate` in that month), grouped by investor; accessory lines (investor null) are counted in the business row (`isOwn`); `investorId` filters to one; the `.xlsx` is the same numbers (use `exceljs@4.4.0`; the only new dependency on this side).
- Every write is audited in the same transaction. No DELETE (BR-12).

## Part 2 (F07-BE-02): stock import, backups

### Types
```ts
type ImportError = { row: number; message: string };
type ImportResult = { created: number; errors: ImportError[] }; // valid rows are created, invalid rows are listed (FR-7)
type Backup = { fileName: string; size: number; createdAt: string; sentToTelegram: boolean; secondCopy: boolean };
type RestoreResult = { restoredFrom: string; safetyBackup: string; finishedAt: string };
```

### Endpoints
| Method | Path | Permission | Body / query | Response |
| --- | --- | --- | --- | --- |
| GET | /items/import/template | manage_prices | – | the `.xlsx` template (one header row + one example row) |
| POST | /items/import | manage_prices | multipart `file` (.xlsx, ≤ 5 MB) | `ImportResult` (200) |
| GET | /backups | manage_backups | – | `Backup[]` newest first (last 30) |
| POST | /backups | manage_backups | – | `Backup` (201): runs a backup now |
| POST | /backups/:fileName/restore | manage_backups | `{ confirm: string }` must equal `fileName` | `RestoreResult` (200). See rules |

### Rules
- **Template columns (FR-7)**, in this order: `category`, `model`, `identifier` (IMEI 15 digits or serial), `owner_code` (Investor.code), `location`, `condition` (NEW/USED), `purchase_price`, `sale_price`, `min_sale_price`, `note`, then one column per category attribute key the row needs (unknown columns are errors). Names are matched case-insensitively and trimmed. Category must be serialized; model must exist in that category (no auto-create); identifier must be free (the existing `assertIdentifiersFree`); owner and location must be active. Each valid row creates an Item exactly like `POST /items` (reuse `ItemsService.create` or its helpers; do not copy the logic) with a `PurchaseLine` from the price and one audit row per item (`action: 'import'`). Rows are independent: a bad row is listed with its 1-based Excel row number and message, good rows are saved. Parse with `exceljs@4.4.0` (the only new dependency on this side) and `multer` (already in `@nestjs/platform-express`; add `@types/multer`).
- **Backups (FR-31)**: a daily job at 03:00 server time (`@nestjs/schedule`) and the manual endpoint run the same function: `pg_dump` of `DATABASE_URL` → gzip → encrypt with `openssl enc -aes-256-cbc -pbkdf2` and `BACKUP_PASSPHRASE` → file `blackstore-YYYY-MM-DD-HHmm.sql.gz.enc` in `BACKUP_DIR`; then send it to Telegram (`TELEGRAM_BOT_TOKEN`, `TELEGRAM_BACKUP_CHAT_ID`, `sendDocument`; skip with a logged warning when the file is over 49 MB or the variables are empty) and copy it to `BACKUP_SECOND_DIR` (the second copy; this must be separate storage, e.g. a mounted network drive or a folder synced to cloud storage, never the same disk; `restore.md` says so). Keep the last 30 files in each folder. New env vars validated at startup; all optional except `BACKUP_DIR` (default `./backups`) and `BACKUP_PASSPHRASE` (required in production). **Restore (client decision: a button, FR-31)**: `fileName` must be a file in `BACKUP_DIR` (reject anything with `/` or `..`); `confirm` must equal it (400 otherwise). Steps: take a fresh safety backup first (same `run()`), then decrypt + gunzip + `psql` the dump into `DATABASE_URL` in one transaction (`--single-transaction`, dump taken with `--clean --if-exists` so tables are replaced); write one audit row (`entity: 'Backup'`, `action: 'restore'`) **after** the restore; return the names. The app stays up during the restore (`// ponytail:` note: no maintenance mode; a request that lands mid-restore may fail once, acceptable for a shop). Also keep `docs/ops/restore.md` with the same steps by hand for the case the app itself is down, and a monthly test-restore checklist. Never log the passphrase or the bot token.

## Client decisions
- Partner payments reuse the sale payments screen; partner debt = Σ balance of its DEBT sales (same rule as customers, BR-8).
- Profit is counted on the date the sale was fully paid (BR-6), so a debt sale from January paid in February appears in February. A return is a loss in the month the return happens (client decision), not in the month of the sale.
- Partner sales are always at the minimum price (BR-7, BR-8); staff change the minimum price before marking the sale if the partner sold for another amount.
- BR-4 is applied literally: the business keeps the fixed amount per item even when the profit is smaller, so the investor share can be negative.
- Restore is a button for the Admin (client decision); it takes a safety backup first. The manual procedure stays documented for the case the app is down.
- BR-4 with profit smaller than the fixed amount is still an open client question; the literal PRD formula is used until answered.
