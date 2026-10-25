import SwiftUI

/// One statement line: what happened, when, and a signed amount coloured by direction.
struct PeopleStatementRow: View {
    let title: String
    var subtitle: String? = nil
    let date: String
    let amount: Double
    /// Overrides the default sign colour (green in, red out).
    var amountTint: Color? = nil

    var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: 12) {
            VStack(alignment: .leading, spacing: 3) {
                Text(title).font(.body)
                if let subtitle, !subtitle.isEmpty {
                    Text(subtitle)
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
                Text(DateDisplay.dateTime(date) ?? String(date.prefix(10)))
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            Spacer(minLength: 8)
            Text((amount >= 0 ? "+" : "−") + APIConfig.formatMoney(abs(amount)))
                .font(.body.weight(.semibold))
                .monospacedDigit()
                .foregroundStyle(amountTint ?? peopleSignTint(amount))
        }
        .padding(.vertical, 2)
        .accessibilityElement(children: .combine)
    }
}
