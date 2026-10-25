import SwiftUI

/// One drawer count block: today's takings, expected amount, the counted field, and the difference.
struct BusinessDayCountSection: View {
    let title: String
    let takingsTitle: String
    let takings: Double
    let expectedTitle: String
    let expected: Double
    let countedTitle: String
    @Binding var counted: String
    let variance: Double

    var body: some View {
        Section(title) {
            MoneyRow(takingsTitle, takings)
            MoneyRow(expectedTitle, expected)
            LabeledContent("\(countedTitle) ($)") {
                TextField("0.00", text: $counted)
                    .decimalCommaFix($counted)
                    .keyboardType(.decimalPad)
                    .multilineTextAlignment(.trailing)
                    .monospacedDigit()
                    .font(.body.weight(.semibold))
            }
            BusinessDayVarianceRow(title: "Tafovut", variance: variance)
        }
    }
}

/// Difference between counted and expected: green when equal, red when short, blue when over.
struct BusinessDayVarianceRow: View {
    let title: String
    let variance: Double

    var body: some View {
        LabeledContent(title) {
            Text(text)
                .fontWeight(.bold)
                .monospacedDigit()
                .foregroundStyle(color)
        }
    }

    private var text: String {
        if abs(variance) < 0.01 { return "To'g'ri (0.00)" }
        if variance < 0 { return "Kamomad: \(APIConfig.formatMoney(variance))" }
        return "Ortiqcha: +\(APIConfig.formatMoney(variance))"
    }

    private var color: Color {
        if abs(variance) < 0.01 { return .green }
        return variance < 0 ? .red : .blue
    }
}
