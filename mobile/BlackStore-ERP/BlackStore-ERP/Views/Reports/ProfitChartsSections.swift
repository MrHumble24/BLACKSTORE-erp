import SwiftUI

/// The report charts in the web order (ProfitReportPage.tsx): trends, composition, margin, the two
/// share donuts, the two rankings and the sales-time heatmap, one inset-grouped section each.
struct ProfitChartsSections: View {
    let report: ProfitReportResponse
    let canViewCost: Bool

    var body: some View {
        ProfitTrendsChart(points: ProfitCharts.trendPoints(report.dailyTrends, previous: report.previousTrends ?? []),
                          canViewCost: canViewCost)
        ProfitWaterfallChart(totals: report.totals)
        ProfitMarginGauge(totals: report.totals, previous: report.previous)
        ProfitShareDonut(title: "Kategoriyalar ulushi", caption: "Savdo kategoriyalar bo'yicha", groups: report.byCategory)
        ProfitShareDonut(title: "Filiallar ulushi", caption: "Savdo filiallar bo'yicha", groups: report.byLocation)
        ProfitRankChart(title: "Kategoriyalar", caption: "Savdo bo'yicha, kattasidan",
                        rows: ProfitCharts.ranked(report.byCategory.map { ($0.name, $0.salesDouble) }),
                        color: ChartPalette.sales)
        ProfitRankChart(title: "Eng foydali modellar", caption: "Yalpi foyda bo'yicha, 8 tagacha",
                        rows: ProfitCharts.ranked((report.topModels ?? []).map { ($0.name, $0.profitDouble) }),
                        color: ChartPalette.profit)
        ProfitHeatmap(buckets: report.heatmap ?? [])
    }
}
