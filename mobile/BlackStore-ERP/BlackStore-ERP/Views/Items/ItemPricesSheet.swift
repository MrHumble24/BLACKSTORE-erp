import SwiftUI

/// "Narxlarni tahrirlash" (manage_prices): sale and minimum price; purchase price only with view_cost.
struct ItemPricesSheet: View {
    @ObservedObject var viewModel: ItemDetailViewModel
    let item: ItemDetail
    let canViewCost: Bool
    @State private var purchase: String
    @State private var sale: String
    @State private var minimum: String

    init(viewModel: ItemDetailViewModel, item: ItemDetail, canViewCost: Bool) {
        self.viewModel = viewModel
        self.item = item
        self.canViewCost = canViewCost
        _purchase = State(initialValue: canViewCost ? item.purchasePrice ?? "" : "")
        _sale = State(initialValue: item.salePrice ?? "")
        _minimum = State(initialValue: item.minSalePrice ?? "")
    }

    /// Valid and changed prices to send, or nil while something is invalid.
    private var payload: UpdateItemPricesPayload? {
        PriceRules.payload(purchase: canViewCost ? purchase : nil, sale: sale, min: minimum,
                           current: (item.purchasePrice, item.salePrice, item.minSalePrice))
    }
    private var orderError: String? {
        PriceRules.orderError(sale: sale, min: minimum, currentSale: item.salePrice, currentMin: item.minSalePrice)
    }

    var body: some View {
        Group {
            Section {
                PriceField(title: "Sotish narxi", text: $sale)
                PriceField(title: "Minimal sotish narxi", text: $minimum)
                if let orderError { InlineMessage(text: orderError, font: .caption) }
            } header: {
                Text("Sotuv")
            } footer: {
                Text("Sotuvchi minimal narxdan arzon sota olmaydi. Bo'sh qoldirilgan narx o'zgarmaydi.")
            }
            if canViewCost {
                Section("Tannarx") { PriceField(title: "Kirim narxi", text: $purchase) }
            }
        }
        .formSheet(title: "Narxlarni tahrirlash", canSave: payload.map { !$0.isEmpty } ?? false,
                   isSaving: viewModel.isSaving, save: save)
    }

    private func save() async throws {
        guard let payload, !payload.isEmpty else { return }
        try await viewModel.updatePrices(payload)
    }
}

/// One money input with its format error below.
private struct PriceField: View {
    let title: String
    @Binding var text: String

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            LabeledContent(title) {
                HStack(spacing: 2) {
                    Text(APIConfig.currency).foregroundStyle(.secondary)
                    TextField("0.00", text: $text)
                        .keyboardType(.decimalPad)
                        .multilineTextAlignment(.trailing)
                        .monospacedDigit()
                        .decimalCommaFix($text)
                        .fixedSize()
                }
            }
            if let error = PriceRules.fieldError(text) { InlineMessage(text: error, font: .caption) }
        }
    }
}
