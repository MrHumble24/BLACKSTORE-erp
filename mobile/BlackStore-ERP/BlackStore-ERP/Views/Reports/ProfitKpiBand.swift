import SwiftUI
import Charts

/// Top of the report (web ProfitKpiBand): net profit card with its period trace, then six stat tiles
/// in a 2-column grid. Each money tile shows the previous period's amount (or its margin note) and
/// the change; Sales and Profit carry a sparkline over the whole period.
struct ProfitKpiBand: View {
    let report: ProfitReportResponse
    let data: ProfitChartData
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
                    Text("Sof rentabellik \(ChartFormat.percent(netMargin))").foregroundStyle(.secondary)
                }
                DeltaLabel(change: change(\.netProfitDouble))
            }
            .font(.footnote)
            .monospacedDigit()
            if data.profitSpark.count > 1 {
                Sparkline(values: data.profitSpark, color: ChartPalette.sales, height: 56, filled: true)
            }
        }
        .padding(.vertical, 6)
        .accessibilityElement(children: .combine)
    }

    private func change(_ key: KeyPath<ProfitTotals, Double>) -> Double? {
        ProfitCharts.percentChange(current: totals[keyPath: key], previous: previous?[keyPath: key])
    }

    /// The previous period's amount, shown under a tile that has no note (web Stat).
    private func previousText(_ key: KeyPath<ProfitTotals, Double>) -> String? {
        guard let value = previous?[keyPath: key], value != 0 else { return nil }
        return APIConfig.formatMoney(value)
    }

    private var tiles: [KpiTile.Model] {
        let summary = report.summary
        let grossMargin = ProfitCharts.grossMargin(totals)
        let returnRate = summary.flatMap { ProfitCharts.margin(Double($0.returnCount), of: Double($0.transactions)) }
        return [
            .init(label: "Sotuvlar", value: APIConfig.formatMoney(totals.salesDouble), change: change(\.salesDouble),
                  note: previousText(\.salesDouble), spark: data.salesSpark, sparkColor: ChartPalette.sales),
            .init(label: "Yalpi foyda", value: APIConfig.formatMoney(totals.profitDouble), change: change(\.profitDouble),
                  note: grossMargin.map { "Marja \(ChartFormat.percent($0))" } ?? previousText(\.profitDouble),
                  spark: data.profitSpark, sparkColor: ChartPalette.profit),
            .init(label: "Xarajatlar", value: APIConfig.formatMoney(totals.expensesDouble),
                  change: change(\.expensesDouble), goodWhenUp: false, note: previousText(\.expensesDouble)),
            .init(label: "Tranzaksiyalar", value: "\(summary?.transactions ?? 0)"),
            .init(label: "Sotilgan dona", value: "\(summary?.unitsSold ?? 0)"),
            // Web shows a bare "0%" when there were no transactions.
            .init(label: "Qaytarish ulushi", value: returnRate.map { ChartFormat.percent($0) } ?? "0%"),
        ]
    }
}

/// One stat tile: label, figure, note (margin or previous amount) and delta, optional sparkline.
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
            if tile.spark.count > 1 {
                Sparkline(values: tile.spark, color: tile.sparkColor, height: 28, filled: false).padding(.top, 4)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .accessibilityElement(children: .combine)
    }
}

/// Axis-free trace of a series; `filled` adds the soft area the net-profit card uses.
struct Sparkline: View {
    let values: [Double]
    let color: Color
    let height: CGFloat
    let filled: Bool

    var body: some View {
        let floor = values.min() ?? 0
        Chart(Array(values.enumerated()), id: \.offset) { point in
            if filled {
                AreaMark(x: .value("Kun", point.offset), yStart: .value("Asos", floor),
                         yEnd: .value("Qiymat", point.element))
                    .interpolationMethod(.monotone)
                    .foregroundStyle(LinearGradient(colors: [color.opacity(0.2), color.opacity(0)],
                                                    startPoint: .top, endPoint: .bottom))
            }
            LineMark(x: .value("Kun", point.offset), y: .value("Qiymat", point.element))
                .interpolationMethod(.monotone)
                .lineStyle(StrokeStyle(lineWidth: 2, lineCap: .round))
                .foregroundStyle(color)
        }
        .chartXAxis(.hidden)
        .chartYAxis(.hidden)
        .chartYScale(domain: .automatic(includesZero: false))
        .frame(height: height)
        .accessibilityHidden(true)
    }
}
