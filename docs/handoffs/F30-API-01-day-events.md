# F30 — Daily close: all day events, walk-in purchases in the drawer, tabs: API contract

Feature: F30 (change request from the client on F13 daily close).
Covers: F13 (daily close / reconciliation), W5 (buy from a walk-in person), FR-25, F27 (confirmed expenses), F28 (closed days history), FR-30 (audit unchanged).
Page: `/close-day` (web). Everything stays behind `close_day` (Admin + SuperAdmin). Nothing new is written; this is read-side plus one drawer-math fix.

## Decision model

1. **Bug fix — walk-in purchases leave the drawer.** W5 step 2: staff hand cash to the seller. Each walk-in purchase is a `PurchaseLine` with `walkInSellerId` set and `unitPrice` = price paid (also for buy-backs). From now on `expectedCash` subtracts Σ `unitPrice × quantity` of walk-in purchase lines whose immutable `createdAt` falls in the day window, exactly like confirmed cash expenses. Closed days keep their frozen snapshot (F13); only days closed after this ships include it.
2. **The owner sees every event of the day** in one chronological feed, newest first, built from records in the open day's window. Kinds and the row each comes from:

   | kind | source (window key) | amount | drawer effect |
   | --- | --- | --- | --- |
   | `SALE` | `Sale` (`createdAt`) | sale total | none (money arrives as payments) |
   | `PAYMENT` | `SalePayment` (`createdAt`) | amount | cash `+amount` or card `+amount` by method |
   | `RETURN` | `Return` (`createdAt`) | refundAmount | cash `−cashRefund` |
   | `EXPENSE` | `LedgerEntry` EXPENSE (`createdAt`) | amount | cash `−amount` only when `inCash && status === CONFIRMED`, else none |
   | `INCOME` | `LedgerEntry` INCOME (`createdAt`) | amount | cash `+amount` when `inCash`, else none |
   | `WALK_IN_PURCHASE` | `PurchaseLine` with `walkInSellerId` (`createdAt`) | unitPrice × quantity | cash `−amount` |
   | `SUPPLIER_PAYMENT` | `SupplierPayment` (`date`) | amount (fee in `fee`) | none (bank transfer) |
   | `INVESTOR_DEPOSIT` / `INVESTOR_PAYOUT` | `InvestorTransaction` (`date`) | amount | none in v1 (owner question below) |
   | `BATCH_RECEIVED` | `PurchaseLine` with `batchId` (`createdAt`), one event per batch | Σ unitPrice × quantity | none |
   | `STOCK_RECEIVED` | `PurchaseLine` with neither `batchId` nor `walkInSellerId` (`createdAt`): a device or accessory added by hand | unitPrice × quantity | none in v1 (owner question below) |
   | `HANDOVER` | `Consignment` (`date`, server-set) | Σ minPrice | none |
   | `CONSIGNMENT_SOLD` | `ConsignmentItem` (`soldAt`) | saleItem.unitPrice | none (payment is a PAYMENT event) |
   | `CONSIGNMENT_RETURNED` | `ConsignmentItem` (`returnedAt`) | minPrice | none |
   | `TRANSFER` | `Transfer` (`date`, server-set) | null | none |
   | `STOCK_COUNT` | `StockCount` (`startedAt`) | null | none |

   `cash`/`card` are `null` whenever the effect is zero (e.g. a RETURN on a debt sale with `cashRefund = 0`), never `"-0.00"`.
   Money rows use the immutable `createdAt` (F13 anti-backdating). Rows that cannot touch the drawer (`SUPPLIER_PAYMENT`, `INVESTOR_*`) are keyed on their editable `date`; that is informational only and never changes expected cash.
3. **Drawer breakdown**: the response says how expected cash is built, so the owner can see each component (including the new walk-in line).
4. **Flags** stay limited to the five existing ref types (SALE, PAYMENT, RETURN, EXPENSE, INCOME). Feed rows of those kinds carry `refType`/`refId`; the others carry `null`. No enum change (YAGNI).
5. **UI**: `/close-day` becomes two tabs. **Current**: the open day (drawer cards with the breakdown, the events feed, the flaggable review tiles, the close bar). **History**: the closed days table from F28.

## Types

```ts
type DayEventKind =
  | 'SALE' | 'PAYMENT' | 'RETURN' | 'EXPENSE' | 'INCOME' | 'WALK_IN_PURCHASE'
  | 'SUPPLIER_PAYMENT' | 'INVESTOR_DEPOSIT' | 'INVESTOR_PAYOUT' | 'BATCH_RECEIVED'
  | 'STOCK_RECEIVED' | 'HANDOVER' | 'CONSIGNMENT_SOLD' | 'CONSIGNMENT_RETURNED' | 'TRANSFER' | 'STOCK_COUNT';

type DayEvent = {
  id: string;                      // `${kind}:${rowId}`
  kind: DayEventKind;
  time: string;                    // ISO, the window key above
  user: { id: number; name: string } | null;
  title: string;                   // raw data only: "#123", category, partner/supplier/investor name, model name, "Sklad → Shop"
  subtitle: string | null;         // raw secondary data only: seller name, reason, identifier value. Never English words (NFR Language): the client translates the fields below
  count: number | null;            // items in a handover / transfer / batch / accessory line
  method: 'CASH' | 'CARD' | null;  // PAYMENT only
  fee: string | null;              // SUPPLIER_PAYMENT fee (decimal string), null when zero
  finished: boolean | null;        // STOCK_COUNT only
  amount: string | null;           // decimal string
  cash: string | null;             // signed drawer effect, e.g. "-150.00", "+200.00"; null = no effect
  card: string | null;             // signed card effect; PAYMENT by card only
  refType: 'SALE' | 'PAYMENT' | 'RETURN' | 'EXPENSE' | 'INCOME' | null;
  refId: number | null;
};

type CurrentBusinessDay = {
  day: { id: number; openedAt: string };
  expectedCash: string; expectedCard: string;
  payments: { cash: string; card: string };                  // unchanged
  breakdown: {                                               // NEW: expectedCash = paymentsCash + cashIncome − cashExpense − cashRefunds − walkInPurchases
    paymentsCash: string; cashIncome: string; cashExpense: string; cashRefunds: string; walkInPurchases: string;
  };
  sales: OpenDaySaleRow[]; returns: OpenDayReturnRow[]; expenses: OpenDayLedgerRow[]; income: OpenDayLedgerRow[]; // unchanged
  events: DayEvent[];                                        // NEW, newest first, whole window (no pagination: one day)
};
```

## Endpoints (all `close_day`)

| Method | Path | Change |
| --- | --- | --- |
| GET | `/business-day/current` | adds `breakdown` and `events`; `expectedCash` now subtracts walk-in purchases |
| POST | `/business-day/close` | unchanged body; the frozen `expectedCash` uses the new math |
| GET `/business-day`, PATCH `/business-day/:id`, POST `/day-close-flags/:id/resolve` | unchanged |

## Owner questions (defaults chosen)

- Investor deposits/payouts: do they go through the cash drawer? Default: **no drawer effect** until the owner says otherwise. If the answer is yes, `InvestorTransaction` needs an immutable `createdAt` first (schema change); its editable `date` must never feed the drawer math.
- Supplier payments: always bank transfer? Default: **no drawer effect**. Same `createdAt` caveat as above.
- Walk-in purchases: always paid in cash from the drawer, including when the device is bought for an investor (`investorId` set)? Default: **yes, always cash from the drawer**.
- Devices or accessories added by hand outside a batch (`STOCK_RECEIVED`): paid from the drawer? Default: **no drawer effect**.

Known side effects (accepted): an Admin editing an item's purchase price inside the open day rewrites the walk-in line's `unitPrice` and so the live expected cash; a SuperAdmin hard delete removes the line. Closed days are frozen and unaffected.

## Follow-up (not in this feature)

- iOS `BusinessDayCloseView`: tabs and the events feed. Separate UI handoff.
