Working tree: main repo. Backend (`server/`) first, then the frontend (`client/`) of the same
feature; they are disjoint and may share the tree. The tree also holds unrelated uncommitted changes
from another session (items page, dashboard): do not touch them. Follow `CLAUDE.md`,
`docs/rules/backend.md`, `docs/rules/frontend.md`. Do not commit. Builds on F25.

# F26 — Investor account: one person, one number, one list (backend + frontend)

## Why

The people who ship devices from Dubai / Hong Kong are the **same people** who own those devices
until they sell (the "investors"). The shop sends them money when it can: sometimes in advance,
sometimes part, sometimes nothing and the devices arrive on credit. Between the shop and each such
person there is one running account: who owes whom.

Today that person exists twice (a Supplier record for shipping, an Investor record for ownership
and profit share) and the debt is split over two pages. The users are market people: the page must
be **one number, one button, one list in plain words**.

Naming: the PRD and the code already use "partner" for partner shops (consignment). This feature is
the **investor account**; keys `investors.account.*`, components `InvestorAccount*`.

PRD: FR-17 (supplier balance = cost of items received − payments), FR-10 (investor money in/out),
FR-9 / BR-3 / BR-4 / BR-6 (profit share), BR-7 (sale lines keep history), FR-29 (staff never see
this), BR-8 (balances are calculated), G3, NFR Usability.

## The one number (one key: the linked supplier for goods and money, the investor for share and cash)

For investor P linked to supplier S:

```
owedToInvestor = supplierBalance(S)                       FR-17 exactly as built today:
               =   Σ PurchaseLine.unitPrice × quantity      goods received from S (devices AND accessories, extra cost excluded)
                 − Σ SupplierPayment.amount (supplierId = S) money sent to S (signed, corrections included)
               − Σ SupplierPayment.fee (supplierId = S, feePaidBy = INVESTOR)   fees P bears
               + Σ SaleItem/ProfitLine.investorShare where the sale line's investorId = P (returns already negative)
               + Σ InvestorTransaction DEPOSIT (P)          cash P handed to the shop
               − Σ InvestorTransaction PAYOUT (P)           cash the shop handed to P
```

Positive = the shop owes P. Negative = P owes the shop (paid in advance, goods not yet arrived).
Consequences, deliberate and to be confirmed with the client (listed at the end):
- Goods are owed from receipt, by **purchase line** (immutable, BR-7), never from `Item.purchasePrice`.
- Extra cost (shipping, customs) is **not** owed to P: the shop paid it (same as FR-17 today).
- Devices P owns but bought from another supplier or a walk-in seller: no goods line (that cost is
  owed to that supplier, or already paid in cash); P's share on their sale still counts.
- The supplier page's balance and this number agree by construction (same first two sums).

## Backend (F26-BE-01)

### Schema (one migration `…_investor_supplier_link`)

```prisma
model Investor { … supplierId Int? @unique; supplier Supplier? @relation(fields: [supplierId], references: [id]) }
model Supplier { … investor Investor? }
```

No data migration; the admin links existing pairs by hand. The OWN investor is never linked.

### Linking: new `investors/investor-link.service.ts` (keeps `investors.service.ts` under 300 lines)

- `link(investorId, supplierId | null, actorId)` used by `PATCH /investors/:id` when the DTO carries
  `supplierId` (`@IsOptional() @IsInt() @IsPositive()`; explicit `null` unlinks). Checks: investor
  404; `isOwn` → 400; supplier 404; supplier inactive → 400 `'Inactive supplier'`; linked to another
  investor → 409 `'Supplier already linked to another investor'`. Linking a supplier **with
  history** is allowed and expected (the old "Dubai" record *is* Sardor); its past payments and
  batches count. Audit `update` on Investor with `before`/`after` carrying `supplierId`.
- `POST /investors` (`CreateInvestorDto.shipsDevices?: boolean`, default **true** in the UI; the
  client's reality is that nearly every investor ships): inside the create transaction, look the
  name up first (`supplier.findUnique({ where: { name } })`, no P2002 catching inside a Postgres
  transaction): an **unlinked** supplier with exactly that name → link it; a linked one → 409
  `'A supplier with this name belongs to another investor'`; none → create it through
  `SuppliersService.create` (import `SuppliersModule`'s exported `SuppliersService`; it writes its
  own audit row) and link. Say in a comment why the lookup happens first.

Detail responses: `GET /investors/:id` adds `supplier: { id, name } | null`; `GET /suppliers/:id`
adds `investor: { id, name } | null` (only with `view_cost`, same gate as its balance). Lists unchanged.

### Account: `GET /investors/:id/account?page&pageSize` (`manage_investors` **and** `view_cost`, 403 otherwise; 400 when not linked)

```ts
{ owedToInvestor: string;  // signed, 2 decimals
  lines: AccountLine[]; total: number; page: number; pageSize: number }

AccountLine = {
  date: string;                       // ISO
  kind: 'GOODS' | 'SENT' | 'FEE' | 'SHARE' | 'RETURN' | 'CASH_IN' | 'CASH_OUT';
  amount: string;                     // signed effect on owedToInvestor (+ owes more, − owes less)
  params: { count?: number; model?: string; supplierName?: string };   // for the client sentence
  ref: { kind: 'batch' | 'sale' | 'supplier' | 'transaction'; id: number } | null;
}
```

Pure line builders in `investors/investor-account-lines.ts` (unit-tested); orchestration in
`investors/investor-account.ts` as a **plain exported function** `loadInvestorAccount(prisma, investor, page)`
(like `loadReportLines`), so nothing new is injected and no module cycle appears. Sources, run
together with `Promise.all`:

- GOODS: `batch.findMany({ where: { supplierId: S }, select: { id, arrivalDate, lines: { select: { unitPrice, quantity } } } })`;
  one line per batch, amount `+Σ unitPrice × quantity` (Decimal, in memory, exactly like
  `SuppliersService.withBalance`), `params.count` = Σ quantity, `ref: batch`.
- SENT / FEE: `supplierPayment.findMany({ where: { supplierId: S } })`: SENT `−amount`
  (`params.supplierName`, `ref: supplier`); when `feePaidBy === INVESTOR` and `fee ≠ 0` a second
  line FEE `−fee`.
- SHARE / RETURN: `loadReportLines(prisma, undefined, { items: { some: { investorId: P } } })`
  (the owner copied onto the sale line, BR-7; **not** `item.investorId`, which a buy-back
  overwrites), keep `line.investor?.id === P`: SALE → SHARE `+investorShare`, RETURN → RETURN
  `+investorShare` (already negative; for a DEFECTIVE return it is P's share of the whole loss, as
  the reports book it), `params.model = line.productModel`, `ref: sale`, date `profitDate`.
- CASH_IN / CASH_OUT: `investorTransaction.findMany({ where: { investorId: P } })`: DEPOSIT
  `+amount`, PAYOUT `−amount`, `ref: transaction`.

Merge, sort by date desc then id desc, `owedToInvestor` = Σ amounts over **all** lines, then slice
the page. `// ponytail: whole history loaded per request (hundreds of lines a year per investor,
not millions); add a materialised ledger when a page takes > 200 ms`.

### Supplier payments (F25 rule relaxed for linked suppliers; no auto-fill)

`SupplierPayment.investorId` keeps its F25 meaning ("whose money was sent") and is **not** set by
the investor page: a payment to Sardor is the shop's money going to Sardor. Change one check in
`SupplierPaymentsService.create`: `feePaidBy === 'INVESTOR'` is allowed when `investorId` is given
**or** the supplier is linked to an investor (then the fee is borne by that linked investor). The
F25 `feesCharged` aggregate on the investor detail must then also include fees on payments to the
linked supplier with `feePaidBy = INVESTOR` and `investorId = null` (one extra `OR`), so F25 and F26
agree.

### Telegram

Nothing in this feature. An "account" button would hand investors a number built from cost, which
the PRD does not allow investors to see (PRD line 42); decide separately.

### Tests

`investor-account-lines.spec`: each source → sign, kind, params; mixed sample → `owedToInvestor`
equals the formula; sort and page; a partner with goods only; a partner who paid in advance
(negative). `investor-link.service.spec`: link / unlink / 404s / inactive 400 / 409 / OWN 400;
`shipsDevices` links an existing unlinked supplier of the same name, 409 on a linked one, creates
otherwise. `supplier-payments.service.spec`: `feePaidBy INVESTOR` without `investorId` on a linked
supplier → stored; on an unlinked supplier → 400 as before. `investors.service.spec`: `feesCharged`
includes linked-supplier fees. Controller: `/account` needs both permissions.

## Frontend (F26-FE-01, after the backend lands)

### Entities

- `entities/investor`: `Investor.supplier?: { id; name } | null` (detail); `useInvestorAccount(id, page, pageSize)`
  → `GET /investors/:id/account`; types `InvestorAccount`, `AccountLine`; `CreateInvestorPayload.shipsDevices?`,
  `UpdateInvestorPayload.supplierId?: number | null`.
- `entities/supplier`: `Supplier.investor?: { id; name } | null`; `useCreateSupplierPayment`
  stays as is (feature-level invalidation below).

### Investor form (`features/manage-investors`)

- Create: a `Switch` **"Sends us devices"** (`investors.shipsDevices`), default on.
- Edit: a `SelectField` **"Supplier record"** (`investors.supplierRecord`): `investors.supplierNone`
  + active unlinked suppliers from `useSuppliers()` + the currently linked one; sends `supplierId`
  or `null`. Hidden for the OWN investor. If the form file would pass 50 lines per component, add
  `InvestorLinkFields.tsx`.

### Investor account page = the investor detail page when `investor.supplier` is set

Unlinked investors keep today's page. For linked ones, the body is `pages/investors/ui/InvestorAccount.tsx`
composed of three small files (split `InvestorDetailPage.tsx` first: move its header into
`InvestorDetailHeader.tsx`; the page stays ≤ 300 lines):

1. `InvestorOwedCard.tsx`: one big number. Label `investors.account.weOwe` ("We owe {{name}}") when
   positive, `investors.account.theyOwe` ("{{name}} owes us") when negative,
   `investors.account.settled` when zero. Number in `font-sf-pro-display` 2xl; negative in
   `text-launch-orange`. One grey hint line `investors.account.hint`
   ("Goods received and profit share add; money sent takes away").
2. **Send money** button (`investors.account.sendMoney`), primary, next to the existing "Add
   deposit/withdrawal" button (kept: FR-10, cash handed over in person is still recorded there).
   It opens the existing `features/manage-suppliers` `SupplierPaymentDialog` with a new prop
   `linkedInvestorName?: string`: when set, the "Whose money" select is hidden and replaced by one
   checkbox `investors.account.feeByInvestor` ("{{name}} pays the fee"), default off → `feePaidBy`;
   `investorId` is **not** sent. Fields shown: amount, fee; date and note collapsed under
   `common.more`. On success the feature invalidates `supplierKeys.all` **and** `investorKeys.all`
   (always, cheap), toast `suppliers.paymentAddedSuccess`.
3. `InvestorStatement.tsx`: the list from `useInvestorAccount`. One row per line: date, sentence,
   amount. Sentences (uz/ru/en, params from the line):
   - GOODS: `investors.account.line.goods` "{{count}} items arrived, {{amount}}"
   - SENT: `investors.account.line.sent` "Sent {{amount}}"
   - FEE: `investors.account.line.fee` "Transfer fee {{amount}}"
   - SHARE: `investors.account.line.share` "Sold {{model}}, share {{amount}}"
   - RETURN: `investors.account.line.return` "Returned {{model}}, share adjusted {{amount}}"
   - CASH_IN: `investors.account.line.cashIn` "Cash received {{amount}}"
   - CASH_OUT: `investors.account.line.cashOut` "Cash paid {{amount}}"
   Right column: `+ amount` in ink when it adds to the debt, `− amount` in `text-launch-orange`
   when it takes away, a tiny grey `investors.account.owesMore` / `owesLess` under it. Rows link
   to `/batches/:id`, `/sales/:id`, `/suppliers/:id`; transaction rows have no link.
   `TablePagination`; empty state `investors.account.empty` ("Nothing yet. Goods and money will
   appear here."). Keep the component ≤ 50 lines: one `StatementRow.tsx`.

Hidden on the account page: the F25 money cards and the "Sent to suppliers" table (the statement
replaces them). Kept: name, badges, Edit, Telegram link status, the deposits/withdrawals table
(FR-10) under the statement, collapsed by default (`investors.account.cashTable`).

### Supplier page

When `supplier.investor` is set (needs `view_cost`), one line at the top:
`investors.account.supplierIsInvestor` ("This is {{name}}'s account") linking to `/investors/:id`;
the payment dialog opened here passes the same `linkedInvestorName`, so the fee checkbox replaces
the "Whose money" select. Everything else unchanged.

### Translations

`investors.shipsDevices|supplierRecord|supplierNone`, `common.more`,
`investors.account.weOwe|theyOwe|settled|hint|sendMoney|feeByInvestor|owesMore|owesLess|empty|cashTable|supplierIsInvestor`,
`investors.account.line.goods|sent|fee|share|return|cashIn|cashOut`, uz/ru/en identical keys.
Uzbek is what the market people read: short, plain words.

### Edge cases

- Goods only, no payments yet → the number is the full goods value; the page renders.
- Sale on credit (DEBT): no share line until paid (BR-6); goods are already counted.
- Return to stock: share reversed; the device is still P's and its goods line stays. DEFECTIVE
  return: P's share of the loss as the reports book it (under NONE share the whole loss; client to
  confirm).
- Buy-back of a device P sold (walk-in purchase): no goods line (the shop paid the seller); the old
  share line stays (BR-7).
- Unlink: the page falls back to the plain investor page; nothing deleted; re-linking later shows
  the full history again.
- Deactivated investor or supplier: page opens (history); "Send money" disabled.
- Staff: never reach `/investors`; the supplier page shows no account line without `view_cost`.
- Language switch: sentences re-render (keys + params).

## For the owner: confirm with the client (the handoff takes these readings)

1. Goods are owed from the day they arrive, at the purchase price on the batch line. Shipping and
   customs are the shop's cost, not owed to the investor.
2. A device the investor owns but which came from another supplier or a walk-in seller: no goods
   debt to the investor, only their share when it sells.
3. On a defective return the investor carries their percentage of the loss (all of it under "no
   share"), as the profit report already does.
4. Nothing from this account is sent to the investor's Telegram.

## Done when

- `server/`: `npm run build`, `npm run lint`, `npm test` pass; migration applied locally.
- `client/`: `npm run build`, `npm run lint`, `node scripts/check-i18n.mjs` pass; files ≤ 300
  lines, components ≤ 50.
- Browser, as Admin: create investor "Sardor" with "Sends us devices" on → supplier "Sardor" exists
  and is linked; receive a batch from Sardor owned by Sardor, 2 devices at 1 000 → the page says
  "We owe Sardor 2 000" with the line "2 items arrived, 2 000" and the supplier page balance is
  2 000; sell one for 1 200 at 70 % share and mark it paid → line "Sold iPhone…, share 140", number
  2 140; Send money 1 500 → line "Sent 1 500", number 640, supplier balance 500; Send money 1 000
  with "Sardor pays the fee" and fee 50 → "Sardor owes us 410" in orange with a "Transfer fee 50"
  line. The supplier page shows "This is Sardor's account". As staff nothing of this is reachable.
