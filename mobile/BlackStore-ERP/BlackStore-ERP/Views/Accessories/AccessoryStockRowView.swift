import SwiftUI

/// One stock row: model and location on the left, quantity and its low/out mark on the right.
/// Average cost only when the user has view_cost (the server leaves it out otherwise).
struct AccessoryStockRowView: View {
    let row: AccessoryStockRow
    let showsCost: Bool
    @Environment(\.dynamicTypeSize) private var typeSize

    private var cost: String? {
        guard showsCost, row.avgCost != nil else { return nil }
        return APIConfig.formatMoney(row.avgCost)
    }

    var body: some View {
        let layout = typeSize.isAccessibilitySize
            ? AnyLayout(VStackLayout(alignment: .leading, spacing: 6))
            : AnyLayout(HStackLayout(alignment: .center, spacing: 12))
        layout {
            details
            if !typeSize.isAccessibilitySize { Spacer(minLength: 8) }
            stock
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(accessibilityText)
    }

    private var details: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(row.productModel.name)
            Text(row.location.name)
                .font(.subheadline)
                .foregroundStyle(.secondary)
            if let cost {
                Text("O'rtacha tannarx: \(cost)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .monospacedDigit()
            }
        }
    }

    private var stock: some View {
        VStack(alignment: typeSize.isAccessibilitySize ? .leading : .trailing, spacing: 2) {
            Text("\(row.quantity) dona")
                .font(.body.weight(.semibold))
                .monospacedDigit()
                .foregroundStyle(row.level == .out ? .secondary : .primary)
            mark
        }
    }

    @ViewBuilder
    private var mark: some View {
        switch row.level {
        case .low: StatusBadge(text: "Kam qolgan", tint: .orange)
        case .out: StatusBadge(text: "Tugagan", tint: .red)
        case .normal: EmptyView()
        }
    }

    private var accessibilityText: String {
        var parts = [row.productModel.name, row.location.name, "\(row.quantity) dona"]
        switch row.level {
        case .low: parts.append("kam qolgan")
        case .out: parts.append("tugagan")
        case .normal: break
        }
        if let cost { parts.append("o'rtacha tannarx \(cost)") }
        return parts.joined(separator: ", ")
    }
}
