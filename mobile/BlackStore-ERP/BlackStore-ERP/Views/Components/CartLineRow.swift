import SwiftUI

/// Visual card presenting a single cart line item with price and quantity editing.
public struct CartLineRow: View {
    public let line: CartLine
    public let onPriceChange: (Double) -> Void
    public let onQuantityChange: (Int) -> Void
    public let onDelete: () -> Void

    @State private var isEditingPrice: Bool = false
    @State private var priceInput: String = ""

    public init(
        line: CartLine,
        onPriceChange: @escaping (Double) -> Void,
        onQuantityChange: @escaping (Int) -> Void,
        onDelete: @escaping () -> Void
    ) {
        self.line = line
        self.onPriceChange = onPriceChange
        self.onQuantityChange = onQuantityChange
        self.onDelete = onDelete
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .top) {
                Image(systemName: line.isDevice ? "iphone" : "cable.connector")
                    .font(.title2)
                    .foregroundStyle(.tint)
                    .frame(width: 32, height: 32)
                    .background(Color(.secondarySystemBackground))
                    .clipShape(RoundedRectangle(cornerRadius: 8))

                VStack(alignment: .leading, spacing: 4) {
                    Text(line.name)
                        .font(.headline)
                        .foregroundStyle(.primary)

                    if let idDisplay = line.identifierDisplay {
                        Text(idDisplay)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(Color(.tertiarySystemBackground))
                            .clipShape(Capsule())
                    }
                }

                Spacer()

                Button(role: .destructive, action: onDelete) {
                    Image(systemName: "trash")
                        .font(.subheadline)
                        .foregroundStyle(.red)
                }
                .buttonStyle(.plain)
            }

            Divider()

            HStack {
                if line.isDevice {
                    Text("1 dona")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                } else {
                    Stepper(value: Binding(
                        get: { line.quantity },
                        set: { onQuantityChange($0) }
                    ), in: 1...999) {
                        Text("\(line.quantity) dona")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                }

                Spacer()

                if isEditingPrice {
                    HStack(spacing: 4) {
                        TextField("Narx", text: $priceInput)
                            .keyboardType(.decimalPad)
                            .textFieldStyle(.roundedBorder)
                            .frame(width: 90)

                        Button("OK") {
                            if let newPrice = Double(priceInput) {
                                onPriceChange(newPrice)
                            }
                            isEditingPrice = false
                        }
                        .buttonStyle(.borderedProminent)
                        .controlSize(.small)
                    }
                } else {
                    Button(action: {
                        priceInput = String(format: "%.2f", line.unitPrice)
                        isEditingPrice = true
                    }) {
                        HStack(spacing: 4) {
                            Text(APIConfig.formatMoney(line.lineTotal))
                                .font(.headline)
                                .foregroundStyle(line.isBelowMinPrice ? .red : .primary)
                            Image(systemName: "pencil")
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                        }
                    }
                    .buttonStyle(.plain)
                }
            }

            if line.isBelowMinPrice, let min = line.minPrice {
                Text("Minimal narxdan kam! (Min: \(APIConfig.formatMoney(min)))")
                    .font(.caption2)
                    .foregroundStyle(.red)
            }
        }
        .padding(12)
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}
