import SwiftUI
import Charts

/// Top of the report (web ProfitKpiBand): net profit hero, then six stat tiles in a 2-column grid,
/// each with the change vs the previous period; Sales and Profit carry a 7-day sparkline.
struct ProfitKpiBand: View {
    let report: ProfitReportResponse
    let isLoading: Bool
    @Environment(\.dynamicTypeSize) private var typeSize

    private var totals: ProfitTotals { report.totals }
    private var previous: ProfitTotals? { report.previous }

    var body: some View {
        Section { hero }
        Section {
            LazyVGrid(columns: columns, alignment: .leading, spacing: 18) {
                ForEach(tiles) { KpiTile(tile: $0) }
            }
            .padding(.vertical, 8)
        }
    }

    /// One column above `.accessibility1` so large figures never truncate.
    private var columns: [GridItem] {
        let count = typeSize >= .accessibility1 ? 1 : 2
        return Array(repeating: GridItem(.flexible(), spacing: 16, alignment: .topLeading), count: count)
    }

    private var hero: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text("Sof foyda").font(.subheadline).foregroundStyle(.secondary)
                Spacer()
                if isLoading { ProgressView() }
            }
            Text(APIConfig.formatMoney(totals.netProfitDouble))
                .font(.largeTitle.weight(.bold))
                .monospacedDigit()
                .minimumScaleFactor(0.5)
                .lineLimit(1)
            HStack(spacing: 10) {
                if let netMargin = ProfitCharts.margin(totals.netProfitDouble, of: totals.salesDouble) {
                    Text("Sof marja \(ChartFormat.percent(netMargin))").foregroundStyle(.secondary)
                }
                DeltaLabel(change: change(\.netProfitDouble))
            }
            .font(.footnote)
            .monospacedDigit()
        }
        .padding(.vertical, 6)
        .accessibilityElement(children: .combine)
    }

    private func change(_ key: KeyPath<ProfitTotals, Double>) -> Double? {
        ProfitCharts.percentChange(current: totals[keyPath: key], previous: previous?[keyPath: key])
    }

    private var tiles: [KpiTile.Model] {
        let trends = report.dailyTrends
        let summary = report.summary
        let grossMargin = ProfitCharts.margin(totals.profitDouble, of: totals.salesDouble)
        let returnRate = summary.flatMap { ProfitCharts.margin(Double($0.returnCount), of: Double($0.transactions)) } ?? 0
        return [
            .init(label: "Savdo", value: APIConfig.formatMoney(totals.salesDouble), change: change(\.salesDouble),
                  spark: ProfitCharts.sparkline(trends.map(\.salesDouble)), sparkColor: ChartPalette.sales),
            .init(label: "Yalpi foyda", value: APIConfig.formatMoney(totals.profitDouble), change: change(\.profitDouble),
                  note: grossMargin.map { "Marja \(ChartFormat.percent($0))" },
                  spark: ProfitCharts.sparkline(trends.map(\.profitDouble)), sparkColor: ChartPalette.profit),
            .init(label: "Chiqimlar", value: APIConfig.formatMoney(totals.expensesDouble),
                  change: change(\.expensesDouble), goodWhenUp: false),
            .init(label: "Tranzaksiyalar", value: "\(summary?.transactions ?? 0)"),
            .init(label: "Sotilgan dona", value: "\(summary?.unitsSold ?? 0)"),
            .init(label: "Qaytarish ulushi", value: ChartFormat.percent(returnRate)),
        ]
    }
}

/// One stat tile: label, figure, margin note and delta, optional sparkline.
struct KpiTile: View {
    struct Model: Identifiable {
        let label: String
        let value: String
        var change: Double? = nil
        var goodWhenUp = true
        var note: String? = nil
        var spark: [Double] = []
        var sparkColor: Color = ChartPalette.sales
        var id: String { label }
    }

    let tile: Model

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(tile.label).font(.footnote).foregroundStyle(.secondary)
            Text(tile.value)
                .font(.title3.weight(.semibold))
                .monospacedDigit()
                .minimumScaleFactor(0.6)
                .lineLimit(1)
            HStack(spacing: 6) {
                if let note = tile.note { Text(note).foregroundStyle(.secondary) }
                DeltaLabel(change: tile.change, goodWhenUp: tile.goodWhenUp)
            }
            .font(.caption)
            .monospacedDigit()
            if tile.spark.count > 1 { sparkline }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .accessibilityElement(children: .combine)
    }

    private var sparkline: some View {
        Chart(Array(tile.spark.enumerated()), id: \.offset) { point in
            LineMark(x: .value("Kun", point.offset), y: .value("Qiymat", point.element))
                .interpolationMethod(.monotone)
                .lineStyle(StrokeStyle(lineWidth: 2, lineCap: .round))
                .foregroundStyle(tile.sparkColor)
        }
        .chartXAxis(.hidden)
        .chartYAxis(.hidden)
        .chartYScale(domain: .automatic(includesZero: false))
        .frame(height: 28)
        .padding(.top, 4)
        .accessibilityHidden(true)
    }
}
