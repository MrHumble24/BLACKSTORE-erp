import SwiftUI

/// One cart line in the POS list: name, code, quantity, price (tap to edit) and delete.
public struct CartLineRow: View {
    public let line: CartLine
    public let onPriceChange: (Double) -> Void
    public let onQuantityChange: (Int) -> Void
    public let onDelete: () -> Void

    @State private var isEditingPrice = false
    @State private var priceInput = ""

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
            HStack(alignment: .firstTextBaseline, spacing: 12) {
                Image(systemName: line.isDevice ? "iphone" : "cable.connector")
                    .foregroundStyle(.tint)
                    .accessibilityHidden(true)
                titleBlock
                Spacer(minLength: 8)
                deleteButton
            }
            HStack {
                quantityControl
                Spacer(minLength: 8)
                priceButton
            }
            if line.isBelowMinPrice, let min = line.minPrice {
                Label("Minimal narxdan kam! (Min: \(APIConfig.formatMoney(min)))", systemImage: "exclamationmark.triangle.fill")
                    .font(.caption)
                    .foregroundStyle(.red)
            }
        }
        .padding(.vertical, 4)
        .swipeActions(edge: .trailing) {
            Button("O'chirish", systemImage: "trash", role: .destructive, action: onDelete)
        }
        .alert("Narxni o'zgartirish", isPresented: $isEditingPrice) {
            TextField("Narx", text: $priceInput)
                .keyboardType(.decimalPad)
                .salesDecimalCommaFix($priceInput)
            Button("Bekor qilish", role: .cancel) {}
            Button("OK") {
                if let newPrice = Double(priceInput) {
                    onPriceChange(newPrice)
                }
            }
        } message: {
            if let min = line.minPrice {
                Text("Minimal narx: \(APIConfig.formatMoney(min))")
            }
        }
    }

    private var titleBlock: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(line.name)
                .font(.headline)
            if let idDisplay = line.identifierDisplay {
                Text(idDisplay)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .textSelection(.enabled)
            }
        }
    }

    private var deleteButton: some View {
        Button(role: .destructive, action: onDelete) {
            Image(systemName: "trash")
                .foregroundStyle(.red)
                .frame(width: 44, height: 44)
                .contentShape(Rectangle())
        }
        .buttonStyle(.borderless)
        .accessibilityLabel("Savatchadan o'chirish")
    }

    @ViewBuilder
    private var quantityControl: some View {
        if line.isDevice {
            Text("1 dona")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        } else {
            Stepper(value: Binding(get: { line.quantity }, set: { onQuantityChange($0) }), in: 1...999) {
                Text("\(line.quantity) dona")
                    .font(.subheadline)
                    .monospacedDigit()
            }
            .fixedSize()
        }
    }

    private var priceButton: some View {
        Button {
            priceInput = String(format: "%.2f", line.unitPrice)
            isEditingPrice = true
        } label: {
            HStack(spacing: 4) {
                Text(APIConfig.formatMoney(line.lineTotal))
                    .font(.headline)
                    .monospacedDigit()
                    .foregroundStyle(line.isBelowMinPrice ? .red : .primary)
                Image(systemName: "pencil")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            .frame(minHeight: 44)
            .contentShape(Rectangle())
        }
        .buttonStyle(.borderless)
        .accessibilityLabel("Narx \(APIConfig.formatMoney(line.lineTotal)), o'zgartirish")
    }
}
