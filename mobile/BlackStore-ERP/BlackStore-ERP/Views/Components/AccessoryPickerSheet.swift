import SwiftUI

/// Sheet to search accessories in stock, set a price and add one to the cart.
public struct AccessoryPickerSheet: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var viewModel = AccessoryPickerViewModel()
    public let onSelect: (Int, String, Double) -> Void

    @State private var customPrice: [Int: String] = [:]

    public init(onSelect: @escaping (Int, String, Double) -> Void) {
        self.onSelect = onSelect
    }

    public var body: some View {
        NavigationStack {
            List {
                if viewModel.filteredItems.isEmpty {
                    Section { stateView }.listRowBackground(Color.clear)
                } else {
                    Section {
                        ForEach(viewModel.filteredItems) { accessoryRow(for: $0) }
                    } footer: {
                        Text("Narxni kiriting va \"+\" tugmasini bosing.")
                    }
                }
            }
            .listStyle(.insetGrouped)
            .searchable(text: $viewModel.searchText, prompt: "Aksessuarni qidirish...")
            .keyboardDoneBar()
            .refreshable { await viewModel.fetchAccessories() }
            .navigationTitle("Aksessuarlar")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Yopish") { dismiss() }
                }
            }
            .task { await viewModel.fetchAccessories() }
        }
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.visible)
    }

    /// Loading, error, no-match and empty-stock states.
    @ViewBuilder
    private var stateView: some View {
        if viewModel.isLoading {
            ProgressView("Aksessuarlar yuklanmoqda...").frame(maxWidth: .infinity, minHeight: 120)
        } else if let err = viewModel.errorMessage {
            ErrorState(message: err) { await viewModel.fetchAccessories() }
        } else if !viewModel.searchText.isEmpty {
            ContentUnavailableView.search(text: viewModel.searchText)
        } else {
            ContentUnavailableView(
                "Aksessuarlar topilmadi",
                systemImage: "tray",
                description: Text("Qoldiqda aksessuarlar mavjud emas.")
            )
        }
    }

    private func priceBinding(for id: Int) -> Binding<String> {
        Binding(get: { customPrice[id] ?? "" }, set: { customPrice[id] = $0 })
    }

    /// Typed price for an accessory, or nil when it is empty, not a number or not above zero.
    private func price(for id: Int) -> Double? {
        guard let value = Double(customPrice[id] ?? ""), value > 0 else { return nil }
        return value
    }

    private func accessoryRow(for item: AccessoryStockItem) -> some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 4) {
                Text(item.productModel.name).font(.body.weight(.medium))
                Text("Qoldiq: \(item.quantity) dona")
                    .font(.caption)
                    .monospacedDigit()
                    .foregroundStyle(.secondary)
            }
            Spacer(minLength: 8)
            TextField("Narx (\(APIConfig.currency))", text: priceBinding(for: item.productModel.id))
                .keyboardType(.decimalPad)
                .multilineTextAlignment(.trailing)
                .monospacedDigit()
                .textFieldStyle(.roundedBorder)
                .frame(maxWidth: 100)
                .decimalCommaFix(priceBinding(for: item.productModel.id))
            Button {
                guard let price = price(for: item.productModel.id) else { return }
                onSelect(item.productModel.id, item.productModel.name, price)
                dismiss()
            } label: {
                Image(systemName: "plus.circle.fill")
                    .font(.title2)
                    .frame(width: 44, height: 44)
            }
            .buttonStyle(.borderless)
            .disabled(price(for: item.productModel.id) == nil)
            .accessibilityLabel("\(item.productModel.name) savatchaga qo'shish")
        }
    }
}
