# F29-BE-01 — Partner transactions feed + optional phone (backend)

Work in the main tree, `server/` only. Follow the rules in CLAUDE.md / GEMINI.md / AGENTS.md and `docs/rules/backend.md`.
Contract: `docs/handoffs/F29-API-01-partner-transactions.md` (read it first). PRD items: FR-26, W4, BR-8.
The tree has unrelated uncommitted edits in `src/telegram-bot/`; do not touch them.

## Build

1. **Optional phone**
   - `prisma/schema.prisma`: `Partner.phone String?`. Migration `prisma/migrations/<ts>_partner_phone_optional` with `ALTER TABLE "Partner" ALTER COLUMN "phone" DROP NOT NULL;`. `prisma generate`.
   - `dto/create-partner.dto.ts`: `phone` → `@IsOptional() @IsString() @MaxLength(40)`. `dto/update-partner.dto.ts`: `phone?: string | null` with the same `@ValidateIf` pattern as `marketLocation` (null clears).
   - `partners.service.ts`: `create` stores `dto.phone?.trim() || null`; `update`: `undefined` leaves it, `null` **or a blank string** clears it (iOS edits send `""`), otherwise trimmed. `toPartner` keeps `phone` (now `string | null`). Search `OR` on phone still works on a nullable column.
   - `grep -rn "\.phone" src --include=*.ts | grep -i partner` and fix any other reader that assumes a string (Telegram texts, receipts, reports). Report what you found.
2. **Transactions feed** — new `src/partners/partner-transactions.service.ts` (keep `partners.service.ts` focused; register the new service in `partners.module.ts`).
   - `dto/query-partner-transactions.dto.ts` extends `PaginationQueryDto`: `from!: string` and `to!: string` (`@IsISO8601()`, both required, full timestamps sent by the client in its local day boundaries). No partner filter.
   - `findAll(query)`: `range = { gte: new Date(from), lte: new Date(to) }` (do **not** use `dateRange`: it treats a date-only `from` as UTC midnight); 400 if either is invalid or `from` > `to`. Load the five sources in one `Promise.all`, each filtered by its own date column. **Never select the full `Item` row** (it carries `purchasePrice`/`extraCost`); select only `productModel { name }` and `identifiers { value }`:
     - consignments: `{ date: range }` select `id, date, partner {id,name}, handedBy {id,name}, items { select: { minPrice } }`.
     - sold items: `consignmentItem` `{ soldAt: range }` select `id, soldAt, consignment { id, partner {id,name} }, item { productModel { name }, identifiers { value, take 1 } }, saleItem { unitPrice, sale { id, seller {id,name} } }`. Amount = `saleItem.unitPrice` (the copy made at sale time, BR-7).
     - returned items: `{ returnedAt: range }`, select `id, minPrice, returnedAt, consignment { id, partner }, item { productModel { name }, identifiers { value, take 1 } }`. Amount = `minPrice`.
     - payments: `salePayment` `{ date: range, sale: { partnerId: { not: null } } }` select `id, amount, method, date, receiver {id,name}, sale { id, partner {id,name} }`.
     - refunds: `return` `{ date: range, sale: { partnerId: { not: null } } }` select `id, refundAmount, date, user {id,name}, sale { id, partner {id,name} }, saleItem { productModel { name }, item { identifiers { value, take 1 } } }`. Kind `REFUND`, amount = `refundAmount`.
   - Map each to `PartnerTransaction` (contract shape). Item label rule = `productModel?.name ?? identifiers[0]?.value ?? 'Device'`. **DRY**: `business-day.service.ts` `toReturnRow` has the same rule; add `itemLabel(productModel: { name: string } | null | undefined, identifiers: { value: string }[] | undefined)` to `common/item-brief.ts` (arguments, not an item object, because the two callers hold the pieces in different shapes) and use it in both places.
   - Merge, sort by `date` desc (tie: `id` desc), compute `totals` (`handedOver, sold, returned, paid, refunded`) over the whole merged list with `Prisma.Decimal`, then slice `skip/take` in memory. Add a `// ponytail:` comment: in-memory merge and paginate; the ranges are a day or a week, switch to a SQL UNION if a custom range ever gets slow.
   - Controller: `@Get('transactions')` in `partners.controller.ts` declared **above** `@Get(':id')`. Controller-level `@Permissions('consign')` already covers it.
3. **Tests**: `partner-transactions.service.spec.ts` with mocked Prisma: the five kinds map to the contract shape (SOLD amount from `unitPrice`), newest-first ordering across kinds, totals ignore pagination, 400 when `from` > `to` or invalid. Extend `partners.service.spec.ts` (if it exists; else add) for create without phone → `null`. **e2e** in `server/test/operations.e2e-spec.ts` or a new `partners.e2e-spec.ts` (keep files ≤ 300 lines): create a partner with no phone (201, `phone: null`), `GET /partners/transactions?from=<ISO start of today>&to=<ISO end of today>` returns 200 with the page shape, and the route is not swallowed by `:id` (no 400 "numeric string").

## Before you finish

`cd server && npx prisma migrate dev --name partner_phone_optional && npm run lint && npm run build && npm test && npm run test:e2e -- operations partners`. The stock-count e2e test fails with a 409 from a leftover open count in the local dev DB; known, not yours. Everything else green. Report the migration name, the phone readers you fixed, the final response shape and the files you touched. Also confirm that PATCH with `phone: ""` stores `null`.
