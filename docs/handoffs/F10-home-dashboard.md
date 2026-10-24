# F10 — Home dashboard (replace the empty welcome page)

Works on **main** tree. The current `client/src/pages/home/ui/HomePage.tsx` is a placeholder
welcome card from F01 — replace it with a real, role-aware home dashboard. Follow **CLAUDE.md**,
`docs/rules/backend.md` and `docs/rules/frontend.md`.

This is additive UX beyond the PRD's explicit FRs, built entirely from data the system already has.
It must respect the existing permission model: **staff never see cost or profit** (FR-29); the whole
thing degrades gracefully for a staff user (hide the money-sensitive tiles, keep the operational ones).

Design language: match the **Falcon-blend** look already shipped on the profit report
(`client/src/pages/reports/ui/`): soft-shadow white cards (the `CARD` style), the shared chart
palette, `money()`/currency where money is shown, SF Pro Display numerals, a bento grid. Reuse those
patterns; do not invent a new visual system.

---

## PART A — Backend (backend-developer, Opus)

New read-only endpoint **`GET /dashboard/summary`** that returns a role-masked snapshot. Reuse the
existing services/helpers (sales, customers debt per BR-8, consignments overdue, items count, the
profit-report line builder) — **no N+1**, paginate nothing (it's a fixed small summary), and mask
cost/profit exactly like the reports do (gate on `view_cost` / `view_profit`).

Response shape (fields in brackets are **admin-only** — omit for users without `view_profit`):

```ts
{
  today: {
    salesCount: number;        // sales created today
    salesTotal: string;        // revenue today (2dp string)
    [profit: string];          // today's gross profit — only with view_profit
  },
  stock: {
    inStockDevices: number;    // items with status IN_STOCK
    atPartnerDevices: number;  // status AT_PARTNER
  },
  debts: {
    customerDebtTotal: string; // sum of outstanding customer debt (BR-8)
    debtorCount: number;       // customers who still owe
  },
  partners: {
    overdueCount: number;      // consignment items past their deadline, still unsold
  },
  [monthNetProfit: string];    // net profit this calendar month (reuse profit report, BR-5) — view_profit only
  recentSales: Array<{         // last 5 sales
    id: number; date: string; customer: string | null;
    total: string; status: 'PAID' | 'DEBT' | 'RETURNED';
  }>;
}
```

Done when: `pnpm build` passes from `server/`, a unit test covers the aggregation (counts + debt
sum + today's totals), existing tests still pass, and no cost/profit leaks to a non-permitted role.
Report the exact final shape back so the frontend can match its types.

## PART B — Frontend (frontend-developer, Opus)

Rebuild `client/src/pages/home/ui/HomePage.tsx` into a dashboard. Add the query hook in an
`entities/dashboard` slice (FSD: `api/` with a `useDashboardSummary()` hook + `model/types.ts`),
and compose the page from small components under `pages/home/ui/`. Every string via i18n (uz/ru/en,
identical keys; Uzbek natural). Use TanStack Query, the shared `CARD`/palette/`money()` helpers.

Layout (bento, responsive, matches the reports page):
1. **Greeting row** — "Good <time>, <name>" + today's date; keep it compact (not a giant hero).
2. **Quick actions** — large tappable buttons routing to the real screens: **New sale** (`/sell`),
   **Receive batch** (`/batches`), **Walk-in buy** (`/purchases`), **Find item** (focus the scan field).
   Show only actions the user has permission for.
3. **KPI tiles** (role-aware): Today's sales (count + total), In stock (devices), Outstanding debt
   (+ debtor count), Overdue at partner. **Admin also:** Today's profit, Net profit this month.
   Reuse the reports KPI/stat styling; money through `money()`; staff build hides the profit tiles.
4. **Two lists:**
   - **Recent sales** (from `recentSales`) — date, customer, total, status badge; row → `/sales/:id`.
   - **Needs attention** — a short list combining debtors to chase and overdue partner items, each
     linking to the relevant screen. (If a count is 0, show a friendly empty state.)

Keep files ≤300 lines, functions ≤50 lines, no `any`, no new dependency (recharts already present if
a sparkline is wanted on the sales tile — optional). Everything must render correctly for a **staff**
user with the money tiles removed.

Done when: `pnpm -C client typecheck`, `pnpm -C client lint` and i18n parity pass; the page renders
for admin (all tiles) and would render for staff (no cost/profit); verify in the browser.

## Reviews
After both parts land, run `code-reviewer`, `security-reviewer`, `prd-guardian` (Opus) in parallel;
fix CRITICAL/HIGH security and any permission leak before calling it done.
