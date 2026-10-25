import SwiftUI
import Charts

/// Ranked groups (web ProfitRankChart): per row the name and figures on one line, then a sales bar on a
/// light full-width track and a profit bar under it; sorted by sales, at most 7 rows.
struct ProfitRankChart: View {
    let title: String
    let caption: String
    let rows: [RankRow]
    /// Row band at the default size (label line + two 6 pt bars), growing with Dynamic Type.
    @ScaledMetric(relativeTo: .caption) private var rowHeight: CGFloat = 40

    private var peak: Double { max(rows.map { max($0.sales, $0.profit) }.max() ?? 0, 1) }

    var body: some View {
        ChartSection(title: title, caption: caption) {
            if rows.isEmpty {
                ChartEmpty(height: 160)
            } else {
                ChartLegend(items: [LegendItem(label: "Sotuvlar", color: ChartPalette.sales),
                                    LegendItem(label: "Yalpi foyda", color: ChartPalette.profit)])
                chart
            }
        }
    }

    private var chart: some View {
        let peak = peak
        return Chart(rows) { row in
            bar(row.name, to: peak, color: ChartPalette.track, offset: 2)
                
            bar(row.name, to: row.sales, color: ChartPalette.sales, offset: 2)
            bar(row.name, to: row.profit, color: ChartPalette.profit, offset: 10)
        }
        .chartXScale(domain: 0...peak)
        .chartXAxis(.hidden)
        .chartYAxis(.hidden)
        .chartOverlay { proxy in labels(proxy) }
        .frame(height: rowHeight * CGFloat(rows.count))
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("\(title): " + rows.map {
            "\($0.name): sotuvlar \(APIConfig.formatMoney($0.sales)), yalpi foyda \(APIConfig.formatMoney($0.profit))"
        }.joined(separator: "; "))
    }

    /// A 6 pt bar from 0 to `value` (negatives draw nothing), shifted down inside the row band.
    private func bar(_ name: String, to value: Double, color: Color, offset: CGFloat) -> some ChartContent {
        BarMark(xStart: .value("Boshi", 0), xEnd: .value("Qiymat", max(value, 0)), y: .value("Nomi", name),
                height: .fixed(6))
            .cornerRadius(3)
            .foregroundStyle(color)
            .offset(y: offset)
    }

    /// Name and figures above each row's bars, as wide as the plot, so a long name truncates before the figures.
    private func labels(_ proxy: ChartProxy) -> some View {
        GeometryReader { geo in
            if let plot = proxy.plotFrame {
                let frame = geo[plot]
                ForEach(rows) { row in
                    if let y = proxy.position(forY: row.name) {
                        // Row centre minus 30 % of the band puts the line just above the sales bar.
                        label(row).frame(width: frame.width)
                            .position(x: frame.midX, y: frame.minY + y - rowHeight * 0.3)
                    }
                }
            }
        }
        .accessibilityHidden(true)
    }

    /// One label line: name on the left, sales and profit on the right.
    private func label(_ row: RankRow) -> some View {
        HStack(spacing: 8) {
            Text(row.name).foregroundStyle(.primary).lineLimit(1)
            Spacer(minLength: 8)
            Text(ChartFormat.shortMoney(row.sales)).fontWeight(.semibold)
            Text(ChartFormat.shortMoney(row.profit)).foregroundStyle(.secondary)
        }
        .font(.caption)
        .monospacedDigit()
    }
}
