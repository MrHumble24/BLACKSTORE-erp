import SwiftUI

/// The report charts in the web order (ProfitReportPage.tsx): trends, composition, margin, the two
/// share donuts, the two rankings and the sales-time heatmap, one inset-grouped section each.
/// Titles and captions are the web's `uz.json` texts.
struct ProfitChartsSections: View {
    let report: ProfitReportResponse
    let data: ProfitChartData
    let canViewCost: Bool

    var body: some View {
        ProfitTrendsChart(data: data, canViewCost: canViewCost)
        ProfitWaterfallChart(totals: report.totals)
        ProfitMarginGauge(totals: report.totals, previous: report.previous)
        ProfitShareDonut(title: "Kategoriyalar bo'yicha sotuvlar", caption: "Sotuvlar ulushi, foizda",
                         slices: data.categorySlices)
        ProfitShareDonut(title: "Filiallar bo'yicha sotuvlar", caption: "Sotuvlar ulushi, foizda",
                         slices: data.locationSlices)
        ProfitRankChart(title: "Kategoriyalar ko'rsatkichlari", caption: "Sotuvlar va yalpi foyda, kattasidan",
                        rows: data.categoryRanks)
        ProfitRankChart(title: "Foyda bo'yicha eng yaxshi mahsulotlar", caption: "Sotuvlar va yalpi foyda, 7 tagacha",
                        rows: data.modelRanks)
        ProfitHeatmap(cells: data.heatCells)
    }
}
