# UI-15 — iOS profit report charts: review fixes

Worktree `.worktrees/UI-14` (branch `task/UI-14`, already merged once as f4b55bf; this pass is a
follow-up on the same branch). Same files as UI-14 plus `Services/APIConfig.swift` (item 12 only).
Do not commit. Rule: match the web (`client/src/pages/reports/ui/*`, `uz.json`) wherever the
handoff and the web disagreed, except the single y-axis on the trend chart, which stays.

## Web parity (PRD review)

1. Empty category name → "Aksessuarlar" (web `ProfitShareDonut.tsx:28`, `ProfitRankChart.tsx:44`).
2. Rankings like the web: sales and profit bars per row (two series, legend), sorted by sales,
   7 rows, for both the category chart and top models. Titles from `uz.json`
   (`reports.categoryDistribution`, `reports.topByProfit`).
3. Donut: fold into "Boshqa" only when there are more than 6 groups; shares as whole percents.
4. Gauge: computed only when sales > 0, otherwise a 0 % gauge (web `ProfitMarginGauge.tsx:15-24`).
5. KPI band: net profit card gets a sparkline over the whole period's profit; tiles without a note
   show the previous period's amount (web `ProfitKpiBand.tsx:53,69,115`). Return rate "0%" when
   zero, like the web.
6. Wording from `uz.json`: waterfall labels `reports.profit` / `reports.expenses` /
   `reports.otherIncome` / `reports.netProfit`, section titles `reports.profitComposition` with
   `reports.compositionSubtitle`, and the other chart titles' exact web keys.
7. Trend chart styling like the web: previous period in light blue, cost dashed (single axis kept;
   no running total).
8. Statement: add the "Qaytarilgan" (refunded) row (web `ProfitStatementCard.tsx:48`).
9. Heatmap weekday labels in Uzbek (Du, Se, Cho, Pa, Ju, Sha, Ya), week starting Monday.

## Code review

10. **Crosshair** `ProfitTrendsChart.swift:110` / `ProfitReportCharts.swift:145`: compare against
    `startOfDay` (or shift the touched date back 12 h) so the readout matches the point under the
    finger; raise the hold to 0.35 s.
11. **Rank labels** `ProfitRankChart.swift:32-37`: one annotation `HStack { name.lineLimit(1); Spacer(); value }`
    sized to the plot width, so long model names never collide with values.
12. **Dynamic Type**: heatmap row height via `@ScaledMetric(relativeTo: .caption2)` and a derived
    frame; gauge caption without the fixed 20 pt frame, outer frame `minHeight`.
13. **Performance**: hoist `showCost`/`hasPrevious` out of the `ForEach`; build chart data once per
    report (a `ProfitChartData` value created when the fetch finishes, held by the view model or an
    `init`), `let steps = steps` in the waterfall body; `APIConfig.formatMoney` uses one
    `private static let` formatter (`Services/APIConfig.swift:71`, allowed for this item).
14. **Small**: `compact()` chooses the suffix after rounding (999 950 → "1M", not "1000K"); drop the
    `sparkline()` wrapper; heatmap rows stored unflipped with a reversed y scale; fix the palette
    comment (the dark expense is `#d9731c`, chosen because `#e07a1f` fails the lightness band).
15. Keep the self-check script updated for items 3, 4, 10 and 14 and paste its output; re-render
    `0-screen`, `2b-trends-crosshair`, `6b-rank-models`, `7-heatmap` and `9-a11y-kpi` in light and
    dark and look at them; remove the harness and restore the app entry file afterwards.

Done when the UI-14 `xcodebuild` prints BUILD SUCCEEDED with zero Swift warnings, files ≤ 300
lines, bodies ≤ 50. Report items done by number, deviations, self-check output, PNG paths, build line.
