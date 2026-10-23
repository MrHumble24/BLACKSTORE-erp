# F09-FE-01 — Profit report: full visual rebuild (client/ only)

Works on the **main** tree (single frontend task, no parallel client work → no worktree).
Follow the rules in **CLAUDE.md / GEMINI.md** and **docs/rules/frontend.md**. Feature-Sliced
Design, TanStack Query + axios, shadcn/ui + Tailwind v4, i18n for every string, no new deps.

## Feature & PRD
- PRD: **FR-28** (profit report), **BR-1…BR-6** (profit, investor split, net profit = gross − expenses + other income).
- This is a **visual rebuild only**. No behaviour, routing, permission or API changes, and **no
  figure that is shown today may disappear** — every total currently on the page stays visible
  (see constraint 8). Only the layout/visuals change.
- Page: `client/src/pages/reports/ui/ProfitReportPage.tsx` and its section components.

## API contract — UNCHANGED, do not touch the backend
`GET /reports/profit?from&to&investorId&locationId&categoryId&page&pageSize` → `ProfitReport`
(type in `client/src/entities/report/model/types.ts`). It already returns **everything** the new
charts need — no endpoint is missing, add nothing to `server/`:
- `totals`: sales, refunded, cost?, profit, investorShare, businessShare, expenses, otherIncome, netProfit (all decimal strings).
- `byCategory[] / byLocation[] / byInvestor[]`: `{ id, name, quantity, sales, profit, investorShare, businessShare }`.
- `dailyTrends[]`: `{ date, quantity, sales, cost?, profit }`.
- `lines`: paginated `ProfitLine[]`.
Use the existing `useProfitReport(filters, page, pageSize)` hook as-is.

## Hard constraints (these are what separates this from AI slop — do not break any)
1. **Permission gating stays EXACTLY as today.** The only gate is `canViewCost`
   (`useAuthStore(s => s.hasPermission('view_cost'))`). When false, the server omits `cost`.
   Never render a Cost value, series, axis or column when `!canViewCost`. Do **not** add new
   gating and do **not** gate profit/shares (they are returned to every role that can open this page).
2. **Every visible string via `t()`** with identical keys in `uz.json`, `ru.json`, `en.json`.
   Reuse the existing `reports.*` keys (listed below). New keys are listed at the end — add all
   three languages, Uzbek natural/idiomatic (not word-for-word).
3. **Money** always through `formatMoney()` from `@/shared/lib`; numbers use `tabular-nums`.
4. **No new dependency.** `recharts` (^3.10.1) is already installed — use it for real charts.
5. **File ≤ 300 lines, function/component ≤ 50 lines.** Split tooltips/legends into small helpers
   (the current `ProfitTrendsChart` is the reference pattern — copy its quality).
6. FSD: all files stay under `client/src/pages/reports/ui/`. Import UI from `@/shared/ui`,
   helpers from `@/shared/lib`, types/hook from `@/entities/report`. Public hooks/components get a
   one-line doc comment. No `any`.
8. **Keep every total that is shown today.** The current page shows these totals and none may be
   dropped: Sales, Gross profit, **Cost (gated on `canViewCost`)**, **Refunded**, Investor share,
   Shop share, Expenses, Other income, Net profit. Put the headline ones on KPI tiles and keep the
   rest in a compact statement card (reuse today's "Trading Performance" + "Shares & Operations"
   two-group layout). The waterfall is an **addition**, never a replacement for these figures.
9. **Design tokens only** (Tailwind v4 theme in `client/src/index.css`) — no raw hex except inside
   chart SVG props, and there use the palette below. Keep the Apple look: white `Card`s on
   `#f5f5f7`, 20–28px radius, hairline borders (`border-hairline-silver/…`), SF Pro, tight tracking.

### Palette for chart SVG props (match existing trends chart)
- sales / primary: `#0066cc` (apple-blue), gradient fill to transparent
- profit / positive: `#059669` (emerald-600)
- cost (only if `canViewCost`): `#98a2af`, dashed
- investor share: `#8b5cf6` (violet-500) · shop share: `#0066cc` · expenses: `#b64400` (launch-orange) · other income: `#059669`
- grid `#eef0f3`, axis tick text `#8e9094`, tooltip card = `bg-gallery-white/95` + `border-hairline-silver/80` + `shadow-lg` + `rounded-2xl` (reuse the existing `TrendTooltip` style).

## What to build (rebuild the report body; keep the controls)
Keep working as-is: `ReportsNavTabs`, `ReportPageHeader`, `ProfitReportFilterControls`,
`ReportSkeleton`, pagination (`TablePagination`). Rebuild the sections below into one cohesive
dashboard. Delete `ProfitDistributionCharts.tsx` (CSS bars) and replace it with a real chart.

1. **`ProfitKpiStrip.tsx`** — top band. Keep the dark **Net profit hero** tile (ink bg, net-margin
   pill, white sparkline from `dailyTrends.profit`) + KPI tiles for **Sales** and **Gross profit**
   (+ margin pill). Beside/below them keep a compact statement card with the remaining totals so
   nothing is lost (constraint 8): **Cost** (only if `canViewCost`), **Refunded**, **Investor share**,
   **Shop share**, **Expenses**, **Other income** — reuse today's two-group "Trading Performance" /
   "Shares & Operations" layout. Each tile/row: small label (steel), `formatMoney` value
   (tabular-nums), tone rules (zero = neutral, negative = destructive).

2. **`ProfitTrendsChart.tsx`** — keep the current `ComposedChart` (sales area + profit line + dashed
   cost line, cost toggle, inline legend, custom tooltip). You may add a thin **gross-margin %** line
   on a right Y-axis (toggleable), but only if it stays legible — otherwise leave as-is. Keep gating.

3. **`ProfitCategoryChart.tsx`** (replaces `ProfitDistributionCharts`) — a **real** recharts
   horizontal `BarChart`: one row per category (from `byCategory`), **Sales** bar (apple-blue) with a
   **Gross profit** bar (emerald) grouped or overlaid, sorted desc by sales, value labels, custom
   tooltip (name · qty · sales · profit). Rounded bar caps. Empty state when no categories.

4. **`ProfitWaterfall.tsx`** (NEW, the headline chart) — "How net profit is built". The steps MUST
   reconcile to the backend identity in `report-shape.ts:61`:
   **`netProfit = profit (gross) − expenses + otherIncome`**. So the waterfall is exactly:
   **Gross profit** → **− Expenses** → **+ Other income** → **= Net profit**.
   ⚠️ **Investor share is NOT a step here** — it is a distribution of gross profit, not a deduction in
   the net-profit identity; including it would make the bars not sum to `totals.netProfit`. (If you
   want investor/shop split shown visually, do it as a separate tiny split bar, clearly labelled —
   not inside this waterfall.) Implement as a recharts stacked `BarChart` (transparent spacer bar +
   visible value bar) or a clean segmented bar; the Gross-profit start and the Net total bar = ink,
   the `+ Other income` step = emerald, the `− Expenses` step = launch-orange. Tooltip shows each
   step's signed amount. Add an assertion/comment that the signed steps sum to `netProfit`.

5. **`ProfitBreakdownSection.tsx`** (rebuild of `ProfitGroupTables`) — keep the segmented tabs
   (Category / Location / Investor, with counts). For the active tab show a small **top-6 by profit**
   horizontal bar chart above (or beside) the existing detail table. Keep the table columns and
   formatting; keep the max-height scroll.

6. **`ProfitLinesTable.tsx`** — keep structure and the cost/gating columns; light restyle only to
   match the rebuilt cards (consistent header cells via `ReportHeadCell`, row hover, tabular-nums).

7. **`ProfitReportPage.tsx`** — recompose: `KpiStrip` → (`TrendsChart` + `Waterfall`) in a grid →
   `CategoryChart` → `BreakdownSection` → `LinesTable` → pagination. Keep loading `ReportSkeleton`.

## New i18n keys (add to en/ru/uz, identical keys)
`reports.kpiOverview`, `reports.salesVsProfit` ("Sales vs profit by category"),
`reports.profitComposition` ("How net profit is built"), `reports.topByProfit` ("Top by gross profit"),
`reports.grossMargin` ("Gross margin"), `reports.step.grossProfit`, `reports.step.expenses`, `reports.step.otherIncome`, `reports.step.netProfit`.
(Reuse existing: sales, cost, profit, netProfit, netMargin, margin, expenses, otherIncome,
investorShare, businessShare, byCategory/Location/Investor, qty, trendsTitle, categoryDistribution, etc.)

## Done when
- `pnpm -C client typecheck` and `pnpm -C client lint` pass; `pnpm -C client build` succeeds.
- Page renders for admin (cost visible) and would hide all cost for a no-`view_cost` role.
- No hard-coded strings; uz/ru/en have the same keys; no file > 300 lines; no `any`; no new dep.
- Charts are real recharts components with the palette above, not CSS bars.
