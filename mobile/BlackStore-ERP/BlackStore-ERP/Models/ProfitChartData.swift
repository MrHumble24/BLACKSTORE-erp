import Foundation

/// Chart-ready series for one profit report, built once when the fetch finishes so SwiftUI updates
/// (scrolling, the crosshair) never re-sort or re-parse the report.
nonisolated struct ProfitChartData {
    let trend: [TrendPoint]
    let trendHasPrevious: Bool
    let trendHasCost: Bool
    /// Whole-period daily values for the KPI sparklines (web ProfitKpiBand).
    let salesSpark: [Double]
    let profitSpark: [Double]
    let categorySlices: [ShareSlice]
    let locationSlices: [ShareSlice]
    let categoryRanks: [RankRow]
    let modelRanks: [RankRow]
    let heatCells: [HeatCell]

    init(report: ProfitReportResponse) {
        trend = ProfitCharts.trendPoints(report.dailyTrends, previous: report.previousTrends ?? [])
        trendHasPrevious = trend.contains { $0.previousSales != nil }
        trendHasCost = trend.contains { $0.cost != nil }
        salesSpark = report.dailyTrends.map(\.salesDouble)
        profitSpark = report.dailyTrends.map(\.profitDouble)
        categorySlices = Self.slices(report.byCategory)
        locationSlices = Self.slices(report.byLocation)
        categoryRanks = ProfitCharts.ranked(report.byCategory)
        modelRanks = ProfitCharts.ranked(report.topModels ?? [])
        heatCells = (report.heatmap ?? []).isEmpty ? [] : ProfitCharts.heatGrid(report.heatmap ?? [])
    }

    private static func slices(_ groups: [ProfitGroup]) -> [ShareSlice] {
        ProfitCharts.slices(groups.map { (ProfitCharts.groupName($0.name), $0.salesDouble) }, otherName: "Boshqa")
    }
}
