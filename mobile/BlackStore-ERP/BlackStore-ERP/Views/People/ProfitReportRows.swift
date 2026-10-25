import SwiftUI

/// One breakdown group: name, profit, number of sales and sales total.
struct ProfitGroupRow: View {
    let group: ProfitGroup

    var body: some View {
        VStack(alignment: .leading, spacing: 3) {
            HStack(alignment: .firstTextBaseline) {
                Text(group.name).font(.body)
                Spacer(minLength: 8)
                Text(APIConfig.formatMoney(group.profitDouble))
                    .font(.body.weight(.semibold))
                    .monospacedDigit()
                    .foregroundStyle(peopleSignTint(group.profitDouble))
            }
            Text("\(group.quantity) ta sotuv · savdo \(APIConfig.formatMoney(group.salesDouble))")
                .font(.footnote)
                .foregroundStyle(.secondary)
                .monospacedDigit()
        }
        .padding(.vertical, 2)
        .accessibilityElement(children: .combine)
    }
}

/// Sales with a margin under 10%, so the owner can check the price.
struct ProfitLowMarginSection: View {
    let items: [LowMarginItem]

    var body: some View {
        Section {
            ForEach(items) { item in
                HStack(alignment: .firstTextBaseline) {
                    VStack(alignment: .leading, spacing: 3) {
                        Text(item.productModel).font(.body)
                        Text("Savdo: \(APIConfig.formatMoney(item.salePrice))")
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                    }
                    Spacer(minLength: 8)
                    VStack(alignment: .trailing, spacing: 3) {
                        Text(APIConfig.formatMoney(item.profit))
                            .font(.body.weight(.semibold))
                            .foregroundStyle(.orange)
                        Text("\(item.marginPct, format: .number.precision(.fractionLength(1)))% marja")
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                    }
                    .monospacedDigit()
                }
                .accessibilityElement(children: .combine)
            }
        } header: {
            Label("Kam marjali sotuvlar (<10%)", systemImage: "exclamationmark.triangle.fill")
                .foregroundStyle(.orange)
        } footer: {
            Text("Foydasi 10% dan kam bo'lgan sotuvlar.")
        }
    }
}
