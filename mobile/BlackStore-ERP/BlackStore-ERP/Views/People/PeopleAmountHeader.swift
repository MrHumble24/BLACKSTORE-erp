import SwiftUI

/// The one big money figure at the top of a People/Money detail screen, coloured by direction.
struct PeopleAmountHeader<Footer: View>: View {
    let title: String
    let amount: Double
    let tint: Color
    @ViewBuilder let footer: () -> Footer

    var body: some View {
        Section {
            VStack(alignment: .leading, spacing: 8) {
                Text(title)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                Text(APIConfig.formatMoney(amount))
                    .font(.largeTitle.weight(.bold))
                    .monospacedDigit()
                    .foregroundStyle(tint)
                    .minimumScaleFactor(0.5)
                    .lineLimit(1)
                footer()
            }
            .padding(.vertical, 6)
            .accessibilityElement(children: .combine)
        }
    }
}

/// Colour for a signed balance: positive green, negative red, zero secondary.
func peopleSignTint(_ value: Double) -> Color {
    if value > 0.005 { return .green }
    if value < -0.005 { return .red }
    return .secondary
}
