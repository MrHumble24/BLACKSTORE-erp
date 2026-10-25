import SwiftUI
import Charts

/// Ranked horizontal bars (web ProfitRankChart), one series: name and value on a line above each bar,
/// the bar on a light full-width track, sorted descending, at most 8 rows.
struct ProfitRankChart: View {
    let title: String
    let caption: String
    let rows: [RankRow]
    let color: Color
    /// 24 pt per bar at the default size, growing with Dynamic Type so labels never collide.
    @ScaledMetric(relativeTo: .caption) private var rowHeight: CGFloat = 24

    private var peak: Double { max(rows.map(\.value).max() ?? 0, 1) }

    var body: some View {
        ChartSection(title: title, caption: caption) {
            if rows.isEmpty {
                ChartEmpty(height: rowHeight * 4)
            } else {
                chart
            }
        }
    }

    private var chart: some View {
        Chart(rows) { row in
            BarMark(xStart: .value("Boshi", 0), xEnd: .value("Chegara", peak), y: .value("Nomi", row.name),
                    height: .fixed(6))
                .cornerRadius(4)
                .foregroundStyle(ChartPalette.track)
                .annotation(position: .top, alignment: .leading, spacing: 3) {
                    Text(row.name).font(.caption).foregroundStyle(.primary).lineLimit(1)
                }
                .annotation(position: .top, alignment: .trailing, spacing: 3) {
                    Text(ChartFormat.shortMoney(row.value)).font(.caption.weight(.semibold)).monospacedDigit()
                }
            BarMark(xStart: .value("Boshi", 0), xEnd: .value("Qiymat", max(row.value, 0)), y: .value("Nomi", row.name),
                    height: .fixed(6))
                .cornerRadius(4)
                .foregroundStyle(color)
        }
        .chartXScale(domain: 0...peak)
        .chartXAxis(.hidden)
        .chartYAxis(.hidden)
        .chartPlotStyle { $0.padding(.top, 2) }
        .frame(height: rowHeight * CGFloat(rows.count) + 4)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("\(title): " + rows.map { "\($0.name) \(APIConfig.formatMoney($0.value))" }.joined(separator: ", "))
    }
}
