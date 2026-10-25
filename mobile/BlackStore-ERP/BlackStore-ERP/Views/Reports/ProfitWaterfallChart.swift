import SwiftUI
import Charts

/// How net profit is built (web ProfitWaterfall): gross profit → − expenses → + other income → net.
/// Totals in ink, the decrease orange, the increase green, each bar labelled with its signed value.
struct ProfitWaterfallChart: View {
    let totals: ProfitTotals

    private static let height: CGFloat = 220
    private var steps: [WaterfallStep] {
        ProfitCharts.waterfall(gross: totals.profitDouble, expenses: totals.expensesDouble,
                               income: totals.otherIncomeDouble,
                               names: ["Yalpi foyda", "Chiqimlar", "Kirimlar", "Sof foyda"])
    }

    var body: some View {
        ChartSection(title: "Foyda tarkibi", caption: "Yalpi foydadan sof foydagacha") {
            if steps.allSatisfy({ $0.signed == 0 }) {
                ChartEmpty(height: Self.height)
            } else {
                chart
            }
        }
    }

    private var chart: some View {
        Chart(steps) { step in
            BarMark(x: .value("Qadam", step.name), yStart: .value("Dan", step.low), yEnd: .value("Gacha", step.high),
                    width: .ratio(0.6))
                .cornerRadius(4)
                .foregroundStyle(color(step.kind))
                .annotation(position: step.signed < 0 && step.kind == .total ? .bottom : .top, spacing: 4) {
                    Text(label(step)).font(.caption.weight(.semibold)).monospacedDigit()
                }
        }
        .chartYAxis { MoneyAxis.marks }
        .chartXAxis {
            AxisMarks { _ in AxisValueLabel(centered: true).font(.caption) }
        }
        .chartYScale(domain: .automatic(includesZero: true))
        .frame(height: Self.height)
        .accessibilityLabel(steps.map { "\($0.name) \(label($0))" }.joined(separator: ", "))
    }

    private func color(_ kind: WaterfallStep.Kind) -> Color {
        switch kind {
        case .total: ChartPalette.ink
        case .up: ChartPalette.profit
        case .down: ChartPalette.expense
        }
    }

    /// Totals unsigned; steps show their sign so "−" reads as money going out.
    private func label(_ step: WaterfallStep) -> String {
        let text = ChartFormat.shortMoney(abs(step.signed))
        if step.kind == .total { return step.signed < 0 ? "−" + text : text }
        return (step.signed < 0 ? "−" : "+") + text
    }
}
