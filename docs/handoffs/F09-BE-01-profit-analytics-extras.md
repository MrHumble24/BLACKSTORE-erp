# F09-BE-01 — Profit report analytics extras (server/ only)

Works on the **main** tree. Follow **CLAUDE.md** and **docs/rules/backend.md** (NestJS, thin controller,
logic in service, Prisma, `$transaction` only for writes — this is all read-only, DTO validation,
mask cost without `view_cost`, no N+1, ≤300 lines/file, ≤50 lines/function, reuse existing helpers).

## Feature & PRD
PRD FR-28 profit report. This adds **read-only analytics fields** derived from the SAME report lines
already built by `loadReportLines` / `buildLinesForSale` — reuse them, do not re-query per item.
All of this is additive; change nothing about existing fields or their cost masking.

## Where
- `server/src/reports/profit-report.service.ts` (service) — add the new aggregations to the `report()` result.
- `server/src/reports/profit-lines.ts` — add small pure aggregation helpers next to `groupLinesByDate`/`sumLines`.
- `server/src/reports/report-shape.ts` — add mappers for the new shapes (keep cost masking identical).
- `server/src/reports/dto/query-profit.dto.ts` — add optional `lowMarginPct`.
- `server/src/reports/report-xlsx.ts` + `reports.controller.ts` — add the xlsx export endpoint.
- Unit tests in `profit-lines.spec.ts` for the new pure helpers (weekday/hour bucketing, low-margin, summary counts).

## 1. `summary` — counts for KPI tiles
Add `summary` to the `report()` response, computed from the in-scope `lines`:
```
summary: {
  transactions: number,   // distinct saleId across all lines
  unitsSold: number,      // sum of quantity over SALE lines only
  returnCount: number,    // count of RETURN lines
}
```
Add a pure helper `summarize(lines: ProfitLine[]): { transactions; unitsSold; returnCount }` in profit-lines.ts.
No money, no cost — safe for all roles.

## 2. `previousTrends` — prior-period daily series (for the comparison overlay)
You already compute `previous` totals via `previousTotals()`. Also return the previous period's daily
series so the client can overlay it:
```
previousTrends: ProfitDailyTrend[]   // same shape as dailyTrends, cost masked without view_cost; [] when no prior range
```
Reuse `loadScopedLines(prev, query)` + `groupLinesByDate` + `toDailyTrend`. Fold it into the existing
`Promise.all` so it doesn't add a serial round-trip (load prev lines once, use for both totals and trends).

## 3. `heatmap` — sales by weekday × hour
From **SALE** lines' `profitDate` (local time), bucket by weekday (0=Sun..6=Sat) and hour (0..23):
```
heatmap: { weekday: number; hour: number; count: number; sales: string }[]   // only non-empty buckets
```
Add a pure helper `heatmapBuckets(lines): HeatmapAcc[]`. `sales` is a 2-dp string (no cost). Do not emit
empty buckets (keep the payload small).

## 4. `lowMargin` — thin-margin watchlist
SALE lines with `salePrice > 0`, ranked by ascending gross margin %, where
`marginPct = profit / salePrice * 100 < lowMarginPct` (DTO `lowMarginPct`, optional, default **10**,
validated `@IsNumber` `@Min(0)` `@Max(100)`). Return at most 8, worst first:
```
lowMargin: { saleId; saleItemId; item: {id,code,model}|null; productModel; salePrice: string; profit: string; marginPct: number }[]
```
`marginPct` rounded to 1 dp. Profit is already returned to every `view_profit` user; do **not** add cost here.

## 5. Excel export — `GET /reports/profit.xlsx`
Mirror the existing `GET /reports/investors.xlsx` (controller + `report-xlsx.ts`):
- New controller method `profitReportXlsx(@Query() QueryProfitDto, @CurrentUser())` streaming a
  `StreamableFile` with `Content-Disposition: attachment; filename="profit-<from>_<to>.xlsx"`.
- New `profitReportToXlsx(report)` in `report-xlsx.ts`: a Totals sheet (the `totals` figures) and a
  Lines sheet (the full, non-paginated lines — call the service with a large pageSize or add a
  `service.allLines()` that returns every mapped line). Respect `view_cost` (omit cost columns when masked).
- Keep it under the file/function size limits; factor sheet-building helpers if needed.

## Client contract (for the frontend; you only implement server)
`GET /reports/profit` gains: `summary`, `previousTrends`, `heatmap`, `lowMargin`. New `GET /reports/profit.xlsx`.
Existing fields unchanged.

## Done when
- `pnpm -C server build` passes; `profit-lines.spec.ts` covers summarize/heatmapBuckets/lowMargin with a
  known fixture; existing 14 tests still pass.
- No cost leaks into `summary`, `heatmap`, `lowMargin`; `previousTrends` masks cost exactly like `dailyTrends`.
- `GET /reports/profit.xlsx` downloads a valid workbook; `view_cost` masking respected.
