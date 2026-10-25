# UI-14 — iOS profit report: charts, mirroring the web report

Worktree `.worktrees/UI-14`, branch `task/UI-14`, iOS app under `mobile/BlackStore-ERP/BlackStore-ERP/`.
Do not commit. Do not touch the Xcode project. PRD FR-28 / FR-11 (profit report), gated by `view_profit`;
cost figures only with `view_cost`.

## Scope and files

- Edit: `Views/ProfitReportsView.swift`, `Views/People/ProfitReportRows.swift`,
  `Models/ProfitReport.swift` (add the missing response fields), `ViewModels/ProfitReportViewModel.swift`
  only if a field must be exposed.
- New: `Views/Reports/*.swift` (one file per chart), `Views/Reports/ChartPalette.swift`.
- Swift Charts (`import Charts`) only; no dependency.

## Data (`GET /reports/profit`, see `server/src/reports/profit-report.service.ts`)

The iOS model decodes `totals, byLocation, byCategory, byInvestor, dailyTrends, lowMargin, lines`.
Add, all optional-safe: `previous: ProfitTotals?`, `previousTrends: [DailyTrend]`,
`summary: {transactions, unitsSold, returned…}` (read `summarize()` in
`server/src/reports/profit-analytics.ts` for the exact keys), `topModels: [ProfitGroup]`,
`heatmap: [{weekday: Int, hour: Int, count: Int, sales: String}]`.

## Charts to build (same set and order as the web, `client/src/pages/reports/ui/ProfitReportPage.tsx`)

1. **KPI band** (`ProfitKpiBand.tsx`): net profit hero with net margin; stat tiles Sales, Profit
   (with gross margin), Expenses, Transactions, Units sold, Return rate; each with the change vs the
   previous period (arrow + percent, green up / red down, inverted for expenses) and a 7-point
   sparkline for Sales and Profit. On iPhone: hero full width, tiles in a 2-column grid.
2. **Trends** (`ProfitTrendsChart.tsx`): daily Sales and Profit as two lines (area under Sales at 12 %
   opacity), previous period as a dashed grey line for Sales, one y-axis, x = day. Tap-and-drag
   crosshair with a floating value readout (`chartOverlay` + `DragGesture`), legend above.
3. **Composition waterfall** (`ProfitWaterfall.tsx`): Gross profit → − Expenses → + Other income →
   Net; floating bars, totals in ink, decreases orange, increases green, value label on each bar.
4. **Margin gauge** (`ProfitMarginGauge.tsx`): half-circle gauge of gross margin %, previous period
   as a tick, the figure in the middle.
5. **Share donuts** (`ProfitShareDonut.tsx`): sales by category and sales by location,
   `SectorMark` with a 2 pt gap and an inner radius, centre caption, legend with name and share %;
   max 5 slices then "Boshqalar".
6. **Rank bars** (`ProfitRankChart.tsx`): category distribution and top models by profit,
   horizontal bars with a light track behind, value at the end, sorted descending, max 8.
7. **Heatmap** (`ProfitHeatmap.tsx`): 7 weekday rows × 24 hour columns, `RectangleMark`, one hue
   with opacity 0.2–1.0 scaled to sales, weekday labels from `Calendar`, legend "kam → ko'p".
8. Keep the existing low-margin list, statement and group tables below the charts.

## Design rules (checked by the reviewer)

- Palette in `ChartPalette.swift`, mirroring `client/src/pages/reports/ui/chartPalette.ts`:
  sales `#0071e3`, profit `#059669`, share/violet `#7c3aed`, expense `#b64400`, teal `#0d9488`,
  cost/neutral `#64748b`, track = `Color(.systemFill)`, grid = `Color(.separator)`.
  Dark mode uses the darker set `#2f8ded, #22a06f, #8f78ea, #e07a1f, #1fa89c` (or whatever passes
  `node /private/tmp/claude-501/bundled-skills/2.1.310/70ea58b2063244497739207b465ab42c/dataviz/scripts/validate_palette.js "<hex,...>" --mode dark`;
  run it and paste the result). Categorical hues are assigned in that fixed order by entity, never
  cycled; the sixth and later slices fold into "Boshqalar" in `cost/neutral`.
- One y-axis per chart, never two scales. Thin marks, 4 pt rounded bar ends, 2 pt lines, markers
  ≥ 8 pt, 2 pt gaps between adjacent fills. Grid and axes recessive (`.separator`, caption font).
- Text uses text colours (primary/secondary), never the series colour; a coloured swatch next to it
  carries identity. Every chart with ≥ 2 series has a legend; single series none.
- Numbers through `APIConfig.formatMoney` and `.monospacedDigit()`; percentages one decimal.
- Each chart sits in its own inset-grouped section with a short title and a one-line caption;
  equal heights for charts in the same row class (trend 220 pt, donuts and gauge 180 pt, rank 24 pt
  per bar, heatmap 7 × 14 pt rows). Identical horizontal padding so left edges align down the page.
- Dynamic Type: chart labels use `.caption`/`.footnote`; nothing truncates at the accessibility
  sizes (switch the KPI grid to one column above `.accessibility1`).
- Accessibility: `.accessibilityLabel` summarising each chart ("Savdo 12 kun, jami …"), and
  `.accessibilityChartDescriptor` where cheap.
- Empty and loading: a chart with no points shows a quiet placeholder line "Bu davrda ma'lumot yo'q"
  inside the same frame, never a collapsed section. Redacted placeholder while loading.
- Cost appears only with `view_cost` (the trend has a cost line on the web only for those users;
  same here).

## Verification

- Build: `xcodebuild -project BlackStore-ERP.xcodeproj -scheme BlackStore-ERP -destination 'generic/platform=iOS Simulator' -configuration Debug CODE_SIGNING_ALLOWED=NO -derivedDataPath /tmp/dd-UI-14 build`
  → BUILD SUCCEEDED, zero Swift warnings; files ≤ 300 lines, bodies ≤ 50.
- Pure logic (waterfall steps, percent change, donut folding, heatmap scaling, margin) in
  `Models/ProfitReportCharts.swift` with a `swift` self-check you run and paste.
- Render check: with the iPhone 17 simulator, render each chart view with sample data to PNG (as
  UI-12 did) into the scratchpad and name the files; look at them for label collisions, alignment
  and overflow, in light and dark mode.
- Report: files, each chart, palette validator output, self-check output, screenshots, build line.
