# F28 — Closed days history and correction: API contract

Feature: F28 Closed days list and later correction by the Admin (change request from the client on F13 daily close).
Covers: F13 (daily close / reconciliation, owner-approved extension of the PRD), FR-30 (audit log), BR-5 (the close expects only confirmed cash expenses, F27).
Page: `/close-day` (web). Everything stays behind `close_day` (Admin + SuperAdmin).

## Decision model

- A closed day's **expected** values (expectedCash, expectedCard) are a frozen close-time snapshot and are **never** edited or recomputed (F13 decision, BR-7 spirit). Sales, payments and expenses recorded later do not change a closed day.
- The Admin may later correct what the owner typed at close time: **countedCash**, **countedCard** and **note**. The server recomputes `cashVariance` and `cardVariance` from the frozen expected values.
- Only `CLOSED` days can be edited (409 for the OPEN day). Flags are not edited here (resolve stays on `/day-close-flags/:id/resolve`).
- Closing a day must refresh the history list on the client (the close mutation invalidates all business-day queries).
- Every correction writes one `AuditLog` row (`action: 'update'`, entity `BusinessDay`, before/after snapshot) — FR-30. No new "edited by" columns on the table; the audit log is the record.
- The list shows only `CLOSED` days, newest first, paginated.

## Types

```ts
// unchanged, already returned by POST /business-day/close
type ClosedDaySnapshot = {
  id: number; openedAt: string; closedAt: string | null; status: 'OPEN' | 'CLOSED';
  note: string | null; closedBy: { id: number; name: string } | null;
  expectedCash: string | null; countedCash: string | null; cashVariance: string | null;
  expectedCard: string | null; countedCard: string | null; cardVariance: string | null;
};

type Page<T> = { items: T[]; total: number; page: number; pageSize: number };
```

## Endpoints (all `close_day`)

| Method | Path | Request | Response |
| --- | --- | --- | --- |
| GET | `/business-day` | query `page` (default 1), `pageSize` (default 20, max 100) | `Page<ClosedDaySnapshot>` — `CLOSED` days only, `closedAt desc`. No date filter in v1 (not requested). |
| PATCH | `/business-day/:id` | `{ countedCash?: string; countedCard?: string; note?: string \| null }` — at least one field present (`note: null` counts: it clears the note); money as decimal strings (`MONEY_REGEX`); note ≤ 500 chars | `ClosedDaySnapshot` with recomputed variances. 404 unknown id, 409 if the day is `OPEN`, 400 if the body is empty |

Existing routes (`GET /business-day/current`, `POST /business-day/close`, `POST /day-close-flags/:id/resolve`) are unchanged.

## Client

- `/close-day` keeps the current close flow at the top. Below it a new **Closed days** section: paginated table (closed date, opened→closed times, expected / counted / variance for cash and card, closed by, note) with an **Edit** action per row.
- Edit opens a dialog with counted cash, counted card and note; on save the list refreshes. The dialog shows the frozen expected values read-only so the Admin sees the variance change.

## Follow-up (not in this feature)

- iOS app (`mobile/`): closed days list in `BusinessDayCloseView` / `BusinessDayViewModel`. Separate UI handoff.
