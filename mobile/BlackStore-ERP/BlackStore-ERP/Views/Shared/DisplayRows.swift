import SwiftUI

/// Label on the left, money on the right, with monospaced digits and optional colour.
struct MoneyRow: View {
    let title: String
    let amount: String
    var tint: Color = .primary
    var isBold: Bool = false

    var body: some View {
        LabeledContent(title) {
            Text(amount)
                .monospacedDigit()
                .fontWeight(isBold ? .bold : .regular)
                .foregroundStyle(tint)
        }
    }
}

extension MoneyRow {
    /// Plain row for a raw amount, formatted as money.
    init(_ title: String, _ amount: Double) {
        self.init(title: title, amount: APIConfig.formatMoney(amount))
    }
}

/// Small coloured capsule for statuses and locations.
struct StatusBadge: View {
    let text: String
    var tint: Color = .accentColor

    var body: some View {
        Text(text)
            .font(.caption2.weight(.semibold))
            .foregroundStyle(tint)
            .padding(.horizontal, 8)
            .padding(.vertical, 3)
            .background(tint.opacity(0.12), in: Capsule())
    }
}
