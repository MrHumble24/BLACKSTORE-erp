# Apple Store Inventory System — PRD

Oct 21, 2026 · @Abdulboriy

## Summary

A web-based inventory and sales system for a business that buys Apple devices (iPhones, iPads, MacBooks) from Dubai and Hong Kong and sells them from a warehouse and a shop. It replaces today's mix of Telegram groups, paper and Excel with one place to track every device by IMEI, who owns it (the business or one of its investors; any number of investors can be added), where it is, and whether it has been paid for.

The full feature list (31 features) is in the companion Feature Specification: Apple Store Inventory System — Feature Specification. This PRD explains why the product exists, who uses it, how the main workflows run, and the rules the system must follow.

## Problem and goals

**Today**, sales are written in a Telegram group by hand. Investor items get a tag like "R+" in the message, and finished sales are copied to a second group once money is collected. Stock is spread across Telegram, paper and some Excel files.

**Problems this causes:**

- No reliable answer to "what do we have in stock, and where?"
- Investor profit is calculated by reading old messages, which is slow and easy to get wrong.
- Debts from customers and partner shops are hard to track.
- Supplier balances and transfer fees are not recorded in one place.
- A past server crash caused lost data and money, so the client does not trust systems without backups.

**Goals**

| # | Goal | How we measure it (targets to confirm with the client) |
| --- | --- | --- |
| G1 | Every device is tracked from arrival to sale | Launch-day stock scan matches the system; monthly stock counts show few or no missing items |
| G2 | Profit is correct per owner | Monthly profit report per owner (the business and each investor) is produced from the system, not from Telegram |
| G3 | Nobody forgets who owes money | Every debt (customer, partner, supplier) has a visible balance and history |
| G4 | Fast daily work | Finding an item by scan takes about a second; a sale takes under a minute |
| G5 | No data loss | A backup exists for every day, and a test restore works |
| G6 | Telegram groups are no longer needed for sales | All sales are recorded in the system within the first month |

## Users

Two roles log in at launch: the owner (Admin) and staff. Investors get read-only access in Phase 2. Everyone else is a record in the system, not a user.

| User | Logs in | Main needs |
| --- | --- | --- |
| Owner (Admin) | Phase 1 | See stock, sales and profit per investor; control prices; manage suppliers, debts, expenses and users. |
| Staff (seller + warehouse) | Phase 1 | Receive batches by scanning, move stock, sell fast, record debts, buy from walk-in people, hand items to partner shops. Must not see cost or profit, and must not delete records. |
| Investors (any number) | Phase 2 | See only their own items, sales and profit. Until Phase 2, the owner exports reports for them. |

**Parties stored as records (no login):** suppliers (Dubai, Hong Kong), customers, walk-in sellers, partner shops. Partner shops report sales by phone, and staff enter them.

## Scope

Phase 1 delivers everything needed to stop using Telegram for sales. Feature numbers refer to the Feature Specification.

| Phase | Included |
| --- | --- |
| **Phase 1** | Inventory and locations (#1–6, #8), investor ownership and reports (#9–10), scanning and labels (#11–13), suppliers and settlements (#14–16), sales, debts, customers, returns, pricing, receipts (#17–22), consignment to partner shops (#23), expenses and profit (#24–25), Admin and Staff roles (#26), audit log (#27), daily backups (#29), web app (#30), server in Germany (#31) |
| **Phase 2** | Investor login (#10, #26), low stock notifications (#7), Telegram sale notifications (#28), native mobile app if needed (#30) |

**Out of scope**

- Multiple currencies. All amounts are in one currency.
- Partner shop login. Partners report by phone.
- Partner shops giving their goods to this business. Consignment goes one way only.
- Automatic import of old Telegram messages and paper records.
- Online shop or customer-facing website.
- Accounting and tax reports for the government.

## Key workflows

Seven workflows cover the daily work. The item status flow (In stock → At partner / Debt → Sold) is drawn in the Feature Specification.

**W1. Receive a batch from a supplier**

1. Staff create a batch: supplier, arrival date, owner (the business or an investor).
2. Staff choose the product model and scan each device's IMEI or serial.
3. The system warns if a code already exists.
4. Admin enters purchase prices and, optionally, extra costs (shipping, customs) and how to split them.
5. Items appear as **In stock** in the warehouse.

**W2. Sell a device**

1. Staff scan the device. The system shows model, owner and minimum price.
2. Staff enter the sale price (not below the minimum), payment type and optional warranty.
3. Paid in full by cash or card → **Sold**. Not fully paid → **Debt**, and a customer (name, phone) is required.
4. A receipt is printed or sent.
5. The Admin confirms each sale, on the daily close page or on the sale page; only then do its cash and card count in the drawer (F33). Status, debt and profit are already final before that.

**W3. Collect a debt**

1. Staff open the customer and record a payment (any amount).
2. When the balance reaches zero, the sale and its items become **Sold**.

**W4. Hand items to a partner shop**

1. Staff choose the partner, scan the items, set a minimum price per item and an optional deadline.
2. Items become **At partner**. They still count as stock and keep their owner.
3. The partner calls when an item is sold. Staff mark it sold: paid → **Sold**, not paid → **Debt**.
4. Unsold items come back → **In stock**. Overdue items are highlighted.

**W5. Buy from a walk-in person**

1. Staff scan or type the IMEI. The system warns if it was in stock or sold before.
2. Staff enter the seller's name and phone, the price agreed and the condition. The shop may pay the seller later; the Admin confirms the payout (on the daily close or the device page) and only then does the cash count as gone (F32).
3. The device becomes **In stock** and can be sold like any other item.

**W6. Transfer stock**

1. Staff choose from and to locations and scan the items.
2. Items move to the new location. The transfer is saved in history.

**W7. Stock count**

1. Staff start a count for a location and scan everything on the shelf.
2. The system lists missing items (in the system, not scanned) and unknown codes (scanned, not in the system).

## Functional requirements

Each requirement is done when its acceptance criteria pass. The last column links to the Feature Specification.

### Inventory

| ID | Requirement | Acceptance criteria | Feature |
| --- | --- | --- | --- |
| FR-1 | Track each device as one record | Every device has its own owner, location, status, condition and prices | #1, #3 |
| FR-2 | Unique identifiers | Saving an IMEI, serial or label code that already exists anywhere is blocked with a clear message | #2, #11 |
| FR-3 | Category fields | Admin can add a category and its fields (text, number, list) without code changes; MacBook, iPhone and iPad are set up at launch | #2 |
| FR-4 | Accessories by quantity | Selling 2 chargers lowers that location's quantity by 2 | #4 |
| FR-5 | Transfers | After a transfer, items show the new location and the transfer appears in history with user and time | #1 |
| FR-6 | Stock count | A count lists missing items and unknown codes for one location | #6 |
| FR-7 | Stock import | An Excel file in the provided template creates items; rows with errors are listed and not imported | #8 |

### Investors

| ID | Requirement | Acceptance criteria | Feature |
| --- | --- | --- | --- |
| FR-8 | Owner per item | Every item has exactly one owner (the business or one investor); Admin can add any number of investors; items received in a batch take the batch's owner | #9, #12 |
| FR-9 | Profit split per investor | Admin sets a split per investor (none, percent, fixed per item); changing it does not change past sales | #10 |
| FR-10 | Investor money | Admin records money put in and paid back; each investor shows a running total | #9 |
| FR-11 | Investor report | Monthly report filtered by all owners, the business, or one investor, shows sales, profit and investor share, and exports to Excel | #10 |

### Scanning and labels

| ID | Requirement | Acceptance criteria | Feature |
| --- | --- | --- | --- |
| FR-12 | Scan to find | Scanning a code with a USB scanner opens the item, including its owner, from any screen with a scan field | #11 |
| FR-13 | Camera fallback | On a phone browser, the camera can scan a barcode into the same field | #11 |
| FR-14 | Batch scanning | After choosing a batch once, each scan adds one item without extra clicks | #12 |
| FR-15 | Labels | Admin can print a barcode label with a unique system code for any item | #13 |

### Suppliers

| ID | Requirement | Acceptance criteria | Feature |
| --- | --- | --- | --- |
| FR-16 | Supplier records | Each supplier shows its batches with arrival dates and items | #14 |
| FR-17 | Supplier balance | Balance = cost of items received − payments; each payment stores its transfer fee | #15 |
| FR-18 | Extra costs (optional) | Off by default; when on for a batch, extra costs are split equally or by price and added to item cost | #16 |

### Sales, customers and partners

| ID | Requirement | Acceptance criteria | Feature |
| --- | --- | --- | --- |
| FR-19 | Sell with payment type | A sale records cash, card or debt; fully paid sales are Sold, others are Debt | #17 |
| FR-20 | Minimum price | Staff cannot save a sale below an item's minimum price; Admin can | #21 |
| FR-21 | Debts | A debt sale requires a customer; partial payments reduce the balance; zero balance turns it Sold | #18, #19 |
| FR-22 | Warranty (optional) | Empty by default; if entered, the end date shows on the receipt and in customer history | #19 |
| FR-23 | Returns | A return puts the item back In stock or Defective and corrects stock, debt and investor profit | #20 |
| FR-24 | Receipts | Each sale can be printed or sent as a receipt | #22 |
| FR-25 | Walk-in purchase | Buying from a person saves their name and phone and adds the device to stock; a known IMEI shows a warning | #5 |
| FR-26 | Consignment | Handover sets a minimum price per item and an optional deadline; partner report shows held, sold-unpaid, total owed and overdue items. The partners page also has a *Transactions* tab: handovers, reported sales, returns, payments and refunds across all partners for today, this week (Monday to today) or custom dates. Partner phone is optional (F29) | #23 |

### Finance, users and system

| ID | Requirement | Acceptance criteria | Feature |
| --- | --- | --- | --- |
| FR-27 | Expenses | Admin records daily income and expenses by category. Every expense starts as *waiting*; Admin then marks it *confirmed* (counts against profit) or *excluded*, and may change that later (F27 change request, Oct 2026) | #24 |
| FR-28 | Profit report | Shows profit per item and net profit (after expenses) by period, investor, location and category | #25 |
| FR-29 | Roles | Staff cannot see cost or profit, cannot delete or edit past records, cannot manage users | #26 |
| FR-30 | Audit log | Every create, change and delete is saved with user, time, and before/after values; Admin can view it | #27 |
| FR-31 | Backups | A backup is sent to a private Telegram group every day, plus a second copy elsewhere; Admin can restore | #29 |

## Business rules

These rules decide every number the system shows. Example used below: an iPhone owned by Investor A, bought for $1,000 with $30 extra cost, sold for $1,200, split 70% to the investor.

| # | Rule | Example |
| --- | --- | --- |
| BR-1 | Item cost = purchase price + extra cost (extra cost is 0 when the optional split is off) | $1,000 + $30 = $1,030 |
| BR-2 | Item profit = sale price − item cost | $1,200 − $1,030 = $170 |
| BR-3 | Investor share (percent) = profit × investor %; business keeps the rest | Investor A $119, business $51 |
| BR-4 | Investor share (fixed per item) = profit − fixed amount; business keeps the fixed amount | Fixed $30 → Investor A $140, business $30 |
| BR-5 | Net profit = all item profits in the period − *confirmed* expenses in the period + other income in the period that Admin marked as counting in profit (e.g. repair fees). Waiting and excluded expenses are shown separately and never subtracted; the daily close expects only confirmed cash expenses gone from the drawer (F27) and also expects walk-in purchase payouts gone from it only once the Admin has confirmed the payout, on the day of confirmation (W5, F30, F32); likewise a sale's cash and card payments are expected in the drawer only once the Admin has confirmed the sale at the close (F33), which changes nothing about the sale's status, debt or profit; the close screen lists every event of the open day with its drawer effect, with closed days in a History tab | — |
| BR-6 | Profit is counted when the item becomes **Sold**, not when it is handed to a partner or sold on debt | Item at partner = $0 profit yet |
| BR-7 | Cost, owner, profit split and consignment minimum price are copied onto the sale when it happens; later changes don't alter past sales | Split changed to 60% next month → this sale stays 70% |
| BR-8 | Balances are calculated, never typed in: customer debt = sale total − payments − refunds; partner debt = minimum prices of sold items − payments − refunds; supplier balance = cost of items received − payments | — |
| BR-9 | Allowed status changes: In stock → At partner, Debt, Sold; At partner → In stock, Debt, Sold; Debt → Sold; Sold or Debt → Returned → In stock or Defective (a return on a debt sale also lowers the debt, FR-23); Sold → In stock only through a walk-in buy-back (W5: we buy our own sold device back from a customer). All others are blocked. There is no "Reserved" status (the shop does not reserve) and no "In transit" status: a transfer moves an item to the new location in one step (W6) | Sold → At partner is blocked |
| BR-10 | Items at a partner still count as stock and keep their owner | — |
| BR-11 | One currency for all amounts | — |
| BR-12 | Records are never hard-deleted by staff; Admin changes are kept in the audit log | — |

## Non-functional requirements

| Area | Requirement |
| --- | --- |
| Performance | Scan lookup returns in about 1 second; common pages load in under 2 seconds from Tashkent |
| Devices | Works in current Chrome on desktop and phone; USB 2D imager scanner works as keyboard input; phone camera scanning in the browser |
| Hosting | Server in Germany (decided). A short legal check on storing Uzbek citizens' personal data abroad is recommended |
| Backups | Daily automatic, encrypted database backup to a private Telegram group, plus a second copy in other storage (Telegram bot uploads are limited to 50 MB). Restore tested monthly |
| Security | HTTPS only; hashed passwords; access checked by permission on the server, not only hidden in the UI; staff sessions expire after inactivity |
| Data integrity | Identifiers unique at database level; money stored as exact decimals; balances calculated from records |
| Auditability | Every change is logged with user, time and before/after values |
| Language | Uzbek (Latin script), Russian and English (English added at the client's request after Phase 1 development started). Each user picks their language; all screens, receipts and reports are translated |
| Tech stack | Next.js (web), NestJS (API), PostgreSQL with Prisma; schema drafted |

## Release plan, risks and open questions

**Release plan** (dates to be set)

1. **Foundation:** users and roles, locations, investors, categories, items, scanning, audit log, backups.
2. **Buying:** suppliers, batches, walk-in purchases, settlements, labels, stock import.
3. **Selling:** sales, payments, debts, customers, receipts, returns, pricing.
4. **Partners and finance:** consignment, expenses, profit and investor reports, stock count, transfers.
5. **Launch:** import stock, scan every device on launch day, train staff, run alongside Telegram for one week, then stop using Telegram for sales.
6. **Phase 2:** investor login, low stock alerts, Telegram sale notifications, mobile app if needed.

**Risks**

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Old stock records are incomplete | Wrong starting stock | Scan every device on launch day (W7) |
| Staff keep using Telegram | Data split in two places | One week of parallel use, then the owner stops Telegram sales |
| Current scanner freezes, can't read screens | Slow daily work | Buy a 2D imager scanner before launch |
| Partner sales reported late by phone | Debts and stock out of date | Overdue highlighting; staff call partners with old items |
| Backup grows past Telegram's 50 MB limit | Backups stop | Second backup storage from day one |
| Personal data stored in Germany | Possible legal issue | Short legal check before launch |

**Assumptions**

- One currency for all amounts.
- Each item has exactly one owner; mixed-money items are not supported.
- Staff work on desktop computers with USB scanners; phones are a backup.

**Open questions**

- [x] UI language: decided. Uzbek and Russian.
- [ ] Starting list of investors and their profit split values.
- [ ] Receipt format: printed (which printer?) or sent by Telegram / SMS?
- [ ] Label printer model, if labels are needed at launch.
