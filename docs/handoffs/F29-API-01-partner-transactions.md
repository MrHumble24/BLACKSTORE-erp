# F29 — Partners page: current vs transactions tabs, optional phone: API contract

Feature: F29 Partner transactions feed and optional partner phone (change request from the client on FR-26 / W4).
Covers: FR-26 (consignment, partner report), W4 (hand items to a partner shop), BR-8 (partner debt computed from records), FR-30 (audit unchanged).
Page: `/partners` (web). Everything stays behind the `consign` permission (Admin + Staff), same as today.

## Decision model

- `/partners` gets two tabs. **Current** = today's partners table (held, sold on credit, total owed, overdue) unchanged. **Transactions** = a date-filtered feed of every partner event across all partners, with presets Today / This week (Monday → today) / Custom from–to.
- A partner **transaction** is one of five events, each already stored by F07; nothing new is written:
  | kind | source row | date used | amount |
  | --- | --- | --- | --- |
  | `HANDOVER` | `Consignment` created | `Consignment.date` | Σ `minPrice` of its items; `count` = number of items |
  | `SOLD` | `ConsignmentItem` reported sold by the partner | `ConsignmentItem.soldAt` | `saleItem.unitPrice`, the price copied onto the sale at report time (BR-7); it equals the min price at that moment |
  | `RETURNED` | `ConsignmentItem` returned to the shop | `ConsignmentItem.returnedAt` | that item's `minPrice` |
  | `PAYMENT` | `SalePayment` on a sale whose `partnerId` is set | `SalePayment.date` | payment `amount` |
  | `REFUND` | `Return` on a sale whose `partnerId` is set (lowers partner debt, BR-8) | `Return.date` | `refundAmount` |
- Amounts are minimum prices, sale-time unit prices, payments and refunds, never cost or profit, so Staff may see the feed (same `consign` permission as the partner report). The item select carries only model name and identifier values; never the full `Item` row (it holds purchase price).
- **Phone becomes optional** when creating or editing a partner (schema, DTOs, client form). Search by phone keeps working. Nothing else about partners changes.

## Types

```ts
type Partner = { id: number; name: string; phone: string | null; marketLocation: string | null; note: string | null };
// PartnerReport, CreatePartnerPayload (phone?: string), UpdatePartnerPayload (phone?: string | null) follow.

type PartnerTransactionKind = 'HANDOVER' | 'SOLD' | 'RETURNED' | 'PAYMENT' | 'REFUND';

type PartnerTransaction = {
  id: string;                       // `${kind}:${sourceRowId}`, unique in the feed
  kind: PartnerTransactionKind;
  date: string;                     // ISO
  partner: { id: number; name: string };
  user: { id: number; name: string } | null;   // handedBy / seller of the sale / payment receiver / return user
  item: string | null;              // SOLD / RETURNED / REFUND: model name, else first identifier, else "Device"; null for HANDOVER / PAYMENT
  count: number;                    // HANDOVER: items handed over; otherwise 1
  amount: string;                   // decimal string, see table above
  method: 'CASH' | 'CARD' | null;   // PAYMENT only
  saleId: number | null;            // SOLD (the sale created at report time), PAYMENT, REFUND
  consignmentId: number | null;     // HANDOVER, SOLD, RETURNED
};

type PartnerTransactionsPage = {
  items: PartnerTransaction[]; total: number; page: number; pageSize: number;
  totals: { handedOver: string; sold: string; returned: string; paid: string; refunded: string };  // over the whole range, not the page
};
```

## Endpoints (all `consign`)

| Method | Path | Change |
| --- | --- | --- |
| GET | `/partners/transactions` | **new**. Query: `from` and `to` (required, full ISO timestamps; the client sends its local start of the first day and local end of the last day, so "today" is the user's day, not the server's), `page`, `pageSize` (shared pagination DTO). Inclusive `gte from, lte to`. Returns `PartnerTransactionsPage`, newest first. Must be declared **before** `GET /partners/:id` so "transactions" is not parsed as an id. 400 when `from` > `to`. No partner filter in v1 (not requested). |
| GET | `/partners`, `/partners/:id` | unchanged shape except `phone: string \| null`. |
| POST | `/partners` | `phone` optional; blank → `null`. |
| PATCH | `/partners/:id` | `phone?: string \| null`; `null` **or blank** clears it (iOS edits send `""`). |

## Client

- `/partners` header (title + Add partner) stays above the tabs. Tab **Current**: existing search, table, pagination. Tab **Transactions**: period presets (Today / This week = Monday → today / Custom), custom date inputs when Custom is chosen, five totals, the feed table, pagination. Rows link to the partner (and to the sale when `saleId` is set).
- Add/Edit partner form: phone no longer required; lists show "—" when missing.

## Follow-up (not in this feature)

- iOS (`mobile/`): decoding is already safe (`Models/PartnerReport.swift` falls back to `""`). Two small UI changes for a later handoff: `Views/CreatePartnerSheet.swift:41` still requires a phone, and `Views/PartnersView.swift:61` shows an empty phone label. The transactions tab on iOS is not planned.
