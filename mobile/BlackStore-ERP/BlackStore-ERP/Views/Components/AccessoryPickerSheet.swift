import SwiftUI

/// Modal sheet for searching and adding non-serialized accessories to the cart.
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
            Group {
                if viewModel.isLoading {
                    ProgressView("Aksessuarlar yuklanmoqda...")
                } else if viewModel.filteredItems.isEmpty {
                    ContentUnavailableView(
                        "Aksessuarlar topilmadi",
                        systemImage: "tray",
                        description: Text("Qoldiqda aksessuarlar mavjud emas.")
                    )
                } else {
                    List(viewModel.filteredItems) { item in
                        accessoryRow(for: item)
                    }
                    .listStyle(.insetGrouped)
                }
            }
            .searchable(text: $viewModel.searchText, prompt: "Aksessuarni qidirish...")
            .navigationTitle("Aksessuarlar")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Yopish") { dismiss() }
                }
            }
            .task {
                await viewModel.fetchAccessories()
            }
        }
    }

    private func accessoryRow(for item: AccessoryStockItem) -> some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(item.productModel.name)
                    .font(.body)
                    .fontWeight(.medium)
                Text("Qoldiq: \(item.quantity) dona")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            TextField("Narx ($)", text: Binding(
                get: { customPrice[item.productModel.id] ?? "" },
                set: { customPrice[item.productModel.id] = $0 }
            ))
            .keyboardType(.decimalPad)
            .textFieldStyle(.roundedBorder)
            .frame(width: 80)

            Button(action: {
                let price = Double(customPrice[item.productModel.id] ?? "0") ?? 0.0
                onSelect(item.productModel.id, item.productModel.name, price)
                dismiss()
            }) {
                Image(systemName: "plus.circle.fill")
                    .font(.title3)
                    .foregroundStyle(.tint)
            }
            .buttonStyle(.plain)
        }
    }
}
