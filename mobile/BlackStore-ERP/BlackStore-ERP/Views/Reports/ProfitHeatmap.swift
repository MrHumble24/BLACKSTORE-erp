import SwiftUI
import Charts

/// When sales happen (web ProfitHeatmap): 7 weekday rows × 24 hour columns, one hue whose opacity
/// (0.2–1.0) follows the sales total; empty hours stay on the light track.
struct ProfitHeatmap: View {
    let buckets: [ProfitHeatmapBucket]

    private static let rowHeight: CGFloat = 14
    /// Weekdays in the user's calendar order (Mon first in Uzbekistan); the server sends 0 = Sunday.
    private static let weekdayOrder: [Int] = {
        let calendar = Calendar.current
        return (0..<7).map { (calendar.firstWeekday - 1 + $0) % 7 }
    }()
    /// Server weekday → numeric row, first weekday on top (row 6).
    private static let rowOf: [Int] = {
        var rows = Array(repeating: 0, count: 7)
        for (position, weekday) in weekdayOrder.enumerated() { rows[weekday] = 6 - position }
        return rows
    }()
    private static let weekdayNames = Calendar.current.shortStandaloneWeekdaySymbols

    var body: some View {
        ChartSection(title: "Savdo vaqti", caption: "Hafta kuni va soat bo'yicha savdo") {
            if buckets.isEmpty {
                ChartEmpty(height: Self.rowHeight * 7 + 20)
            } else {
                scaleLegend
                chart
            }
        }
    }

    private var chart: some View {
        Chart(ProfitCharts.heatGrid(buckets)) { cell in
            // Cells stop short of the hour edges and rows; that margin is the 2 pt gap between neighbours.
            // Rows are numeric (top row = 6) so the cell height is exact; labels come from `weekdayRow`.
            let row = Double(Self.rowOf[cell.weekday])
            RectangleMark(xStart: .value("Soat", Double(cell.hour) + 0.08), xEnd: .value("Soat", Double(cell.hour) + 0.92),
                          yStart: .value("Kun", row + 0.07), yEnd: .value("Kun", row + 0.93))
                .foregroundStyle(cell.opacity > 0 ? AnyShapeStyle(ChartPalette.sales.opacity(cell.opacity))
                                                  : AnyShapeStyle(ChartPalette.track))
                .cornerRadius(2)
        }
        .chartXScale(domain: 0...24)
        .chartYScale(domain: 0...7)
        .chartXAxis {
            // Labels sit under the middle of their hour column.
            AxisMarks(values: [0.5, 6.5, 12.5, 18.5, 23.5]) { value in
                AxisValueLabel(anchor: .top) { Text("\(Int(value.as(Double.self) ?? 0)):00").font(.caption2) }
            }
        }
        .chartYAxis {
            AxisMarks(position: .leading, values: (0..<7).map { Double($0) + 0.5 }) { value in
                AxisValueLabel {
                    let row = Int(value.as(Double.self) ?? 0)
                    Text(Self.weekdayNames[Self.weekdayOrder[6 - row]]).font(.caption2)
                }
            }
        }
        .frame(height: Self.rowHeight * 7 + 20)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(accessibilitySummary)
    }

    /// "kam → ko'p" scale: five steps of the same hue.
    private var scaleLegend: some View {
        HStack(spacing: 4) {
            Text("kam")
            ForEach([0.2, 0.4, 0.6, 0.8, 1.0], id: \.self) { step in
                RoundedRectangle(cornerRadius: 2).fill(ChartPalette.sales.opacity(step)).frame(width: 12, height: 12)
            }
            Text("ko'p")
        }
        .font(.caption)
        .foregroundStyle(.secondary)
        .accessibilityHidden(true)
    }

    private var accessibilitySummary: String {
        guard let peak = buckets.max(by: { $0.salesDouble < $1.salesDouble }) else { return "Savdo vaqti" }
        return "Eng faol vaqt: \(Self.weekdayNames[peak.weekday]) \(peak.hour):00, \(APIConfig.formatMoney(peak.salesDouble))"
    }
}
