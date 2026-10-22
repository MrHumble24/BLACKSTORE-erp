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

type ProfitLine = { saleId: number; saleItemId: number; profitDate: string; item: { id: number; code: string; model: string } | null; productModel: string; quantity: number; investor: { id: number; name: string } | null; location: { id: number; name: string }; category: { id: number; name: string }; salePrice: string; refunded: string; cost: string; profit: string; investorShare: string; businessShare: string };
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
| POST | /consignments/:id/items/:itemId/sell | sell | `{ paid: boolean; price?; method?: PaymentMethod }` | `Consignment`. See rules |
| POST | /consignments/:id/items/:itemId/return | consign | – | `Consignment`. Item AT_PARTNER → IN_STOCK |
| GET | /sales | sell | add `partnerId` to the existing filters | partner sales are included only when `partnerId` is given (today they are hidden) |
| GET | /reports/profit | view_profit | `?from&to&investorId&locationId&categoryId&page&pageSize` | `ProfitReport` |
| GET | /reports/investors | view_profit | `?month=YYYY-MM&investorId` | `InvestorReport` |
| GET | /reports/investors.xlsx | view_profit | same | an `.xlsx` file (`Content-Disposition: attachment`), one row per investor plus totals, same numbers |

### Rules
- **Handover (FR-26, W4)**: every item must be `IN_STOCK` (400 naming the first that is not); duplicates → 400; max 200 items; `minPrice` > 0; `dueDate` today or later. In one transaction: each item `IN_STOCK → AT_PARTNER` through `ItemsService.changeStatus` (conditional write, like sales), create `Consignment` + `ConsignmentItem`s, one audit row. Items keep their location and owner (W4 step 2).
- **Partner reports a sale (W4 step 3)**: the consignment item must be `AT_PARTNER`. `price` defaults to `minPrice` and may not be below it unless the user has `manage_prices`. In one transaction: create a `Sale` with `partnerId`, `customerId` null, `locationId` = the item's location, `sellerId` = the user, one device line (snapshots as in F05: reuse the F05 line builder, do not copy it), `total` = price; `paid: true` → a `SalePayment` for the full amount (`method` default CASH), sale `PAID`, item `AT_PARTNER → SOLD`; `paid: false` → sale `DEBT`, item `AT_PARTNER → DEBT`. Set `ConsignmentItem.status = SOLD`, `soldAt`, `saleItemId`. Audit once. Later partner payments go through `POST /sales/:id/payments` unchanged; when that closes the debt the item goes `DEBT → SOLD` (F05 already does this).
- **Return from partner (W4 step 4)**: `AT_PARTNER → IN_STOCK`, `ConsignmentItem.status = RETURNED`, `returnedAt`. Audit once.
- **Overdue**: `dueDate` set, `dueDate < today`, item still `AT_PARTNER`.
- **Profit report (FR-28, BR-1 to BR-6)**: one line per `SaleItem` of a sale whose status is `PAID` or `RETURNED` (BR-6: debt sales count only once paid; partner sales too). `profitDate` = the sale's last payment date, or the sale date when it has no payments (a cash sale has one payment at creation, so both are the same); the period filter is on `profitDate`. Per line: `refunded` = Σ `refundAmount` of its returns; `returnedToStock` = Σ quantity of `BACK_TO_STOCK` returns; `salePrice` = `unitPrice × quantity`; `cost` = `unitCost × (quantity − returnedToStock)` (goods that came back cost nothing; defective ones still do); `profit = salePrice − refunded − cost`. Investor share on `profit`: investor `isOwn` or null → 0; `NONE` → all of it; `PERCENT` → `profit × shareValue / 100`; `FIXED_PER_ITEM` → `profit − shareValue × quantity` (never below 0 when profit is positive; when profit ≤ 0 the investor share is the whole profit); `businessShare = profit − investorShare`. Totals: `expenses` = Σ ledger `EXPENSE` with `date` in the period; `otherIncome` = Σ ledger `INCOME` with `countsInProfit` in the period; `netProfit = profit − expenses + otherIncome` (BR-5). Groups sum the same lines by investor (null investor shown as "Accessories"), location and category. `lines` are paginated; totals and groups cover the whole filter. Money arithmetic in `Prisma.Decimal`, 2 decimals.
- **Investor report (FR-11)**: the same lines for the month (`profitDate` in that month), grouped by investor; `investorId` filters to one; the `.xlsx` is the same numbers (use `exceljs@4.4.0`; the only new dependency on this side).
- Every write is audited in the same transaction. No DELETE (BR-12).

## Part 2 (F07-BE-02): stock import, backups

### Types
```ts
type ImportError = { row: number; message: string };
type ImportResult = { created: number; errors: ImportError[] }; // valid rows are created, invalid rows are listed (FR-7)
type Backup = { fileName: string; size: number; createdAt: string; sentToTelegram: boolean; secondCopy: boolean };
```

### Endpoints
| Method | Path | Permission | Body / query | Response |
| --- | --- | --- | --- | --- |
| GET | /items/import/template | manage_prices | – | the `.xlsx` template (one header row + one example row) |
| POST | /items/import | manage_prices | multipart `file` (.xlsx, ≤ 5 MB) | `ImportResult` (200) |
| GET | /backups | manage_backups | – | `Backup[]` newest first (last 30) |
| POST | /backups | manage_backups | – | `Backup` (201): runs a backup now |

### Rules
- **Template columns (FR-7)**, in this order: `category`, `model`, `identifier` (IMEI 15 digits or serial), `owner_code` (Investor.code), `location`, `condition` (NEW/USED), `purchase_price`, `sale_price`, `min_sale_price`, `note`, then one column per category attribute key the row needs (unknown columns are errors). Names are matched case-insensitively and trimmed. Category must be serialized; model must exist in that category (no auto-create); identifier must be free (the existing `assertIdentifiersFree`); owner and location must be active. Each valid row creates an Item exactly like `POST /items` (reuse `ItemsService.create` or its helpers; do not copy the logic) with a `PurchaseLine` from the price and one audit row per item (`action: 'import'`). Rows are independent: a bad row is listed with its 1-based Excel row number and message, good rows are saved. Parse with `exceljs@4.4.0` (the only new dependency on this side) and `multer` (already in `@nestjs/platform-express`; add `@types/multer`).
- **Backups (FR-31)**: a daily job at 03:00 server time (`@nestjs/schedule`) and the manual endpoint run the same function: `pg_dump` of `DATABASE_URL` → gzip → encrypt with `openssl enc -aes-256-cbc -pbkdf2` and `BACKUP_PASSPHRASE` → file `blackstore-YYYY-MM-DD-HHmm.sql.gz.enc` in `BACKUP_DIR`; then send it to Telegram (`TELEGRAM_BOT_TOKEN`, `TELEGRAM_BACKUP_CHAT_ID`, `sendDocument`; skip with a logged warning when the file is over 49 MB or the variables are empty) and copy it to `BACKUP_SECOND_DIR` (the second copy; a mounted or synced folder). Keep the last 30 files in each folder. New env vars validated at startup; all optional except `BACKUP_DIR` (default `./backups`) and `BACKUP_PASSPHRASE` (required in production). Restore is a documented manual step, not an endpoint: `docs/ops/restore.md` with the exact `openssl` + `gunzip` + `psql` commands and a monthly test-restore checklist. Never log the passphrase or the bot token.

## Client decisions
- Partner payments reuse the sale payments screen; partner debt = Σ balance of its DEBT sales (same rule as customers, BR-8).
- Profit is counted on the date the sale was fully paid (BR-6), so a debt sale from January paid in February appears in February.
- Restore is a documented manual procedure run by the Admin on the server, not a button.
