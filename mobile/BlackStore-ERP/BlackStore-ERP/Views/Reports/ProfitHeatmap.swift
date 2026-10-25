import SwiftUI
import Charts

/// When sales happen (web ProfitHeatmap): 7 weekday rows (Monday first) × 24 hour columns, one hue
/// whose opacity (0.2–1.0) follows the sales total; empty hours stay on the light track.
struct ProfitHeatmap: View {
    let cells: [HeatCell]
    /// Row and axis heights scale with Dynamic Type so the weekday labels never overlap.
    @ScaledMetric(relativeTo: .caption2) private var rowHeight: CGFloat = 14
    @ScaledMetric(relativeTo: .caption2) private var axisHeight: CGFloat = 20

    /// Uzbek short weekday names by server weekday (0 = Sunday).
    private static let names = ["Ya", "Du", "Se", "Cho", "Pa", "Ju", "Sha"]
    /// Row order top to bottom, Monday first.
    private static let order = [1, 2, 3, 4, 5, 6, 0]
    /// Server weekday → row index (0 = top); the y scale is reversed, so row 0 draws on top.
    private static let rowOf: [Int] = (0..<7).map { weekday in order.firstIndex(of: weekday) ?? 0 }

    private var chartHeight: CGFloat { rowHeight * 7 + axisHeight }

    var body: some View {
        ChartSection(title: "Kun va soat bo'yicha sotuvlar", caption: "Har bir soatdagi sotuvlar summasi") {
            if cells.isEmpty {
                ChartEmpty(height: chartHeight)
            } else {
                scaleLegend
                chart
            }
        }
    }

    private var chart: some View {
        Chart(cells) { cell in
            // Cells stop short of the hour and row edges; that margin is the 2 pt gap between neighbours.
            let row = Double(Self.rowOf[cell.weekday])
            RectangleMark(xStart: .value("Soat", Double(cell.hour) + 0.08), xEnd: .value("Soat", Double(cell.hour) + 0.92),
                          yStart: .value("Kun", row + 0.07), yEnd: .value("Kun", row + 0.93))
                .foregroundStyle(cell.opacity > 0 ? AnyShapeStyle(ChartPalette.sales.opacity(cell.opacity))
                                                  : AnyShapeStyle(ChartPalette.track))
                .cornerRadius(2)
        }
        .chartXScale(domain: 0...24)
        // Reversed 0…7 so row 0 (Monday) is on top without flipping the stored rows.
        .chartYScale(domain: .automatic(includesZero: true, reversed: true, dataType: Double.self) { $0 = [0, 7] })
        .chartXAxis {
            // Labels sit under the middle of their hour column.
            AxisMarks(values: [0.5, 6.5, 12.5, 18.5, 23.5]) { value in
                AxisValueLabel(anchor: .top) { Text("\(Int(value.as(Double.self) ?? 0)):00").font(.caption2) }
            }
        }
        .chartYAxis {
            AxisMarks(position: .leading, values: (0..<7).map { Double($0) + 0.5 }) { value in
                AxisValueLabel { Text(Self.names[Self.order[Int(value.as(Double.self) ?? 0)]]).font(.caption2) }
            }
        }
        .frame(height: chartHeight)
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
        guard let peak = cells.max(by: { $0.sales < $1.sales }) else { return "Sotuvlar vaqti" }
        return "Eng faol vaqt: \(Self.names[peak.weekday]) \(peak.hour):00, \(APIConfig.formatMoney(peak.sales))"
    }
}
