import SwiftUI
import Charts

/// Daily Sales and Profit lines on one money axis (web ProfitTrendsChart); Sales has a 12 % area,
/// the previous period's Sales is a dashed grey line, cost appears only with view_cost.
/// Touch-and-hold then drag shows a crosshair with a value readout.
struct ProfitTrendsChart: View {
    let points: [TrendPoint]
    let canViewCost: Bool
    @State private var selected: TrendPoint?

    private static let height: CGFloat = 220
    private var hasPrevious: Bool { points.contains { $0.previousSales != nil } }
    private var showCost: Bool { canViewCost && points.contains { $0.cost != nil } }

    var body: some View {
        ChartSection(title: "Savdo va foyda", caption: "Kunlik savdo va yalpi foyda") {
            if points.isEmpty {
                ChartEmpty(height: Self.height)
            } else {
                ChartLegend(items: legend)
                chart
            }
        }
    }

    private var legend: [LegendItem] {
        var items = [LegendItem(label: "Savdo", color: ChartPalette.sales),
                     LegendItem(label: "Foyda", color: ChartPalette.profit)]
        if showCost { items.append(LegendItem(label: "Tannarx", color: ChartPalette.neutral)) }
        if hasPrevious { items.append(LegendItem(label: "O'tgan davr", color: Color(.tertiaryLabel), dashed: true)) }
        return items
    }

    private var chart: some View {
        Chart {
            ForEach(points) { point in
                AreaMark(x: .value("Kun", point.date, unit: .day), y: .value("Savdo", point.sales))
                    .interpolationMethod(.monotone)
                    .foregroundStyle(ChartPalette.sales.opacity(0.12))
                line(point.date, point.sales, series: "Savdo", color: ChartPalette.sales)
                line(point.date, point.profit, series: "Foyda", color: ChartPalette.profit)
                if showCost, let cost = point.cost {
                    line(point.date, cost, series: "Tannarx", color: ChartPalette.neutral)
                }
                if let previous = point.previousSales {
                    line(point.date, previous, series: "O'tgan davr", color: Color(.tertiaryLabel), dash: [4, 3])
                }
            }
            if let selected { crosshair(selected) }
        }
        .chartLegend(.hidden)
        .chartYAxis { MoneyAxis.marks }
        .chartXAxis {
            AxisMarks(values: .automatic(desiredCount: 4)) { _ in
                AxisValueLabel(format: .dateTime.day().month(.abbreviated), collisionResolution: .greedy)
                    .font(.caption)
            }
        }
        .chartOverlay { proxy in CrosshairGesture(proxy: proxy, points: points, selected: $selected) }
        .frame(height: Self.height)
        .accessibilityLabel(accessibilitySummary)
        .accessibilityChartDescriptor(TrendDescriptor(points: points))
    }

    private func line(_ date: Date, _ value: Double, series: String, color: Color, dash: [CGFloat] = []) -> some ChartContent {
        LineMark(x: .value("Kun", date, unit: .day), y: .value(series, value), series: .value("Seriya", series))
            .interpolationMethod(.monotone)
            .lineStyle(StrokeStyle(lineWidth: 2, lineCap: .round, dash: dash))
            .foregroundStyle(color)
    }

    /// Vertical rule, 8 pt markers on both series and the floating readout above the plot.
    @ChartContentBuilder
    private func crosshair(_ point: TrendPoint) -> some ChartContent {
        RuleMark(x: .value("Kun", point.date, unit: .day))
            .foregroundStyle(ChartPalette.grid)
            .lineStyle(StrokeStyle(lineWidth: 1))
            .annotation(position: .top, spacing: 4, overflowResolution: .init(x: .fit(to: .chart), y: .fit(to: .chart))) {
                TrendReadout(point: point, showCost: showCost)
            }
        PointMark(x: .value("Kun", point.date, unit: .day), y: .value("Savdo", point.sales))
            .foregroundStyle(ChartPalette.sales).symbolSize(64)
        PointMark(x: .value("Kun", point.date, unit: .day), y: .value("Foyda", point.profit))
            .foregroundStyle(ChartPalette.profit).symbolSize(64)
    }

    private var accessibilitySummary: String {
        let sales = points.reduce(0) { $0 + $1.sales }
        let profit = points.reduce(0) { $0 + $1.profit }
        return "Savdo \(points.count) kun, jami \(APIConfig.formatMoney(sales)); foyda \(APIConfig.formatMoney(profit))"
    }
}

/// Hold-then-drag over the plot picks the nearest day; a plain swipe still scrolls the list.
private struct CrosshairGesture: View {
    let proxy: ChartProxy
    let points: [TrendPoint]
    @Binding var selected: TrendPoint?

    var body: some View {
        GeometryReader { geo in
            Rectangle().fill(.clear).contentShape(Rectangle())
                .gesture(
                    LongPressGesture(minimumDuration: 0.2)
                        .sequenced(before: DragGesture(minimumDistance: 0))
                        .onChanged { value in
                            guard case .second(true, let drag?) = value, let plot = proxy.plotFrame else { return }
                            let x = drag.location.x - geo[plot].origin.x
                            if let date: Date = proxy.value(atX: x) { selected = ProfitCharts.nearest(points, to: date) }
                        }
                        .onEnded { _ in selected = nil }
                )
        }
    }
}

/// Floating card: day, then swatch + name + exact money per series.
private struct TrendReadout: View {
    let point: TrendPoint
    let showCost: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(point.date.formatted(.dateTime.day().month(.wide))).font(.caption.weight(.semibold))
            row("Savdo", point.sales, ChartPalette.sales)
            row("Foyda", point.profit, ChartPalette.profit)
            if showCost, let cost = point.cost { row("Tannarx", cost, ChartPalette.neutral) }
            if let previous = point.previousSales { row("O'tgan davr", previous, Color(.tertiaryLabel)) }
        }
        .padding(8)
        .background(Color(.tertiarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 10))
        .overlay(RoundedRectangle(cornerRadius: 10).stroke(ChartPalette.grid, lineWidth: 0.5))
    }

    private func row(_ name: String, _ value: Double, _ color: Color) -> some View {
        HStack(spacing: 6) {
            Circle().fill(color).frame(width: 8, height: 8)
            Text(name).foregroundStyle(.secondary)
            Spacer(minLength: 12)
            Text(APIConfig.formatMoney(value)).monospacedDigit()
        }
        .font(.caption)
    }
}

/// VoiceOver audio graph: day on x, sales on y.
private struct TrendDescriptor: AXChartDescriptorRepresentable {
    let points: [TrendPoint]

    func makeChartDescriptor() -> AXChartDescriptor {
        let values = points.map(\.sales)
        let x = AXCategoricalDataAxisDescriptor(title: "Kun", categoryOrder: points.map { $0.date.formatted(date: .abbreviated, time: .omitted) })
        let y = AXNumericDataAxisDescriptor(title: "Savdo", range: (values.min() ?? 0)...(values.max() ?? 0), gridlinePositions: []) {
            APIConfig.formatMoney($0)
        }
        let series = AXDataSeriesDescriptor(name: "Savdo", isContinuous: true, dataPoints: points.map {
            AXDataPoint(x: $0.date.formatted(date: .abbreviated, time: .omitted), y: $0.sales)
        })
        return AXChartDescriptor(title: "Savdo va foyda", summary: nil, xAxis: x, yAxis: y, additionalAxes: [], series: [series])
    }
}
