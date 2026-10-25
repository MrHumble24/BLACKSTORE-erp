import SwiftUI
import Charts

/// Shared pieces for the report charts (mirrors client chartKit.tsx): section chrome, legend,
/// empty placeholder, period delta and the number formats every chart uses.
enum ChartFormat {
    /// Short money for axes and bar labels ("$12.3K"); exact figures use `APIConfig.formatMoney`.
    static func shortMoney(_ value: Double) -> String {
        // Same decimal mark as formatMoney (locale), so "$13,8K" and "$13 800,00" agree.
        let text = ProfitCharts.compact(abs(value)) // "." to match formatMoney, which forces a dot
        return (value < 0 ? "-" : "") + APIConfig.currency + text
    }

    /// Percent with one decimal ("12.5%").
    static func percent(_ value: Double) -> String {
        value.formatted(.number.precision(.fractionLength(1))) + "%"
    }
}

/// One inset-grouped section per chart: short title, one-line caption, then the chart.
struct ChartSection<Content: View>: View {
    let title: String
    let caption: String
    @ViewBuilder let content: Content

    var body: some View {
        Section {
            VStack(alignment: .leading, spacing: 12) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(title).font(.headline)
                    Text(caption).font(.footnote).foregroundStyle(.secondary)
                }
                content
            }
            .padding(.vertical, 6)
        }
    }
}

/// One legend entry; `dashed` draws a short dashed stroke instead of a dot.
struct LegendItem: Identifiable {
    let label: String
    let color: Color
    var dashed = false
    var id: String { label }
}

/// Swatch + text pairs; text stays in the secondary text colour, the swatch carries identity.
struct ChartLegend: View {
    let items: [LegendItem]

    var body: some View {
        // One line when it fits, else two per line, else one per line.
        ViewThatFits(in: .horizontal) {
            HStack(spacing: 14) { entries(items) }
            VStack(alignment: .leading, spacing: 4) {
                ForEach(Array(stride(from: 0, to: items.count, by: 2)), id: \.self) { start in
                    HStack(spacing: 14) { entries(Array(items[start..<min(start + 2, items.count)])) }
                }
            }
            VStack(alignment: .leading, spacing: 4) { entries(items) }
        }
        .font(.caption)
        .foregroundStyle(.secondary)
        .accessibilityHidden(true)
    }

    private func entries(_ items: [LegendItem]) -> some View {
        ForEach(items) { item in
            HStack(spacing: 6) {
                if item.dashed {
                    Path { $0.move(to: CGPoint(x: 0, y: 1)); $0.addLine(to: CGPoint(x: 14, y: 1)) }
                        .stroke(item.color, style: StrokeStyle(lineWidth: 2, dash: [4, 3]))
                        .frame(width: 14, height: 2)
                } else {
                    Circle().fill(item.color).frame(width: 8, height: 8)
                }
                Text(item.label).fixedSize()
            }
        }
    }
}

/// Quiet line shown inside the chart frame when the period has no points.
struct ChartEmpty: View {
    let height: CGFloat

    var body: some View {
        Text("Bu davrda ma'lumot yo'q")
            .font(.footnote)
            .foregroundStyle(.secondary)
            .frame(maxWidth: .infinity, minHeight: height)
    }
}

/// Change vs the previous period: arrow + percent, green when the move is good, red when bad.
struct DeltaLabel: View {
    let change: Double?
    /// Expenses rising is bad, so they pass false.
    var goodWhenUp = true

    var body: some View {
        if let change {
            let up = change > 0
            HStack(spacing: 2) {
                Image(systemName: up ? "arrow.up.right" : "arrow.down.right").imageScale(.small)
                Text(ChartFormat.percent(abs(change)))
            }
                .font(.caption.weight(.semibold))
                .monospacedDigit()
                .foregroundStyle(up == goodWhenUp ? Color.green : Color.red)
                .accessibilityLabel("O'tgan davrga nisbatan \(up ? "+" : "−")\(ChartFormat.percent(abs(change)))")
        }
    }
}

/// The one money y-axis every cartesian report chart uses: recessive grid, short caption labels.
enum MoneyAxis {
    static var marks: some AxisContent {
        AxisMarks(position: .leading, values: .automatic(desiredCount: 4)) { value in
            AxisGridLine(stroke: StrokeStyle(lineWidth: 0.5)).foregroundStyle(ChartPalette.grid)
            AxisValueLabel {
                if let amount = value.as(Double.self) {
                    Text(ChartFormat.shortMoney(amount)).font(.caption).monospacedDigit()
                }
            }
        }
    }
}
