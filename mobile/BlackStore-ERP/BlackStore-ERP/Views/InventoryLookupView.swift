import SwiftUI

/// Searchable list of in-stock devices with a branch filter; can add a device to the cart (PRD FR-12).
public struct InventoryLookupView: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var viewModel = InventoryLookupViewModel()
    public let onAddToCart: ((Item) -> Void)?

    public init(onAddToCart: ((Item) -> Void)? = nil) {
        self.onAddToCart = onAddToCart
    }

    /// Changes whenever a filter changes, so the debounced fetch re-runs.
    private var filterKey: String {
        "\(viewModel.searchText)|\(viewModel.selectedLocation?.id ?? -1)"
    }

    public var body: some View {
        NavigationStack {
            content
                .safeAreaInset(edge: .top, spacing: 0) {
                    if !viewModel.locations.isEmpty { locationFilterBar }
                }
                .navigationTitle("Ombor")
                .navigationBarTitleDisplayMode(.inline)
                .searchable(text: $viewModel.searchText, prompt: "Model, IMEI yoki seriya raqami")
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) {
                        Button("Yopish") { dismiss() }
                    }
                }
                .task { await viewModel.fetchLocations() }
                .task(id: filterKey) {
                    // Debounce typing so we don't hit the server on every keystroke.
                    try? await Task.sleep(for: .milliseconds(300))
                    guard !Task.isCancelled else { return }
                    await viewModel.fetchItems()
                    // A newer keystroke cancelled this fetch; its "cancelled" error is not real.
                    if Task.isCancelled { viewModel.errorMessage = nil }
                }
        }
        .presentationDetents([.large])
        .presentationDragIndicator(.visible)
    }

    @ViewBuilder
    private var content: some View {
        if viewModel.isLoading && viewModel.items.isEmpty {
            LoadingState()
        } else if let err = viewModel.errorMessage, viewModel.items.isEmpty {
            ErrorState(message: err) { await viewModel.fetchItems() }
        } else if viewModel.items.isEmpty {
            if viewModel.searchText.isEmpty {
                ContentUnavailableView("Omborda tovarlar topilmadi", systemImage: "shippingbox")
            } else {
                ContentUnavailableView.search(text: viewModel.searchText)
            }
        } else {
            itemsList
        }
    }

    private var locationFilterBar: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                StockFilterChip(title: "Barchasi", isSelected: viewModel.selectedLocation == nil) {
                    viewModel.selectedLocation = nil
                }
                ForEach(viewModel.locations) { loc in
                    StockFilterChip(title: loc.name, isSelected: viewModel.selectedLocation?.id == loc.id) {
                        viewModel.selectedLocation = loc
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 8)
        }
        .background(.bar)
    }

    private var itemsList: some View {
        List(viewModel.items) { item in
            InventoryItemRow(item: item, onAdd: onAddToCart.map { add in
                {
                    add(item)
                    HapticManager.success()
                    dismiss()
                }
            })
        }
        .listStyle(.insetGrouped)
        .refreshable { await viewModel.fetchItems() }
    }
}

/// One in-stock device: model, identifier, price, branch, condition and optional "add to cart".
private struct InventoryItemRow: View {
    let item: Item
    let onAdd: (() -> Void)?

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .firstTextBaseline) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(item.productModel.name).font(.headline)
                    Text(item.primaryIdentifier).font(.caption.monospaced()).foregroundStyle(.secondary)
                }
                Spacer()
                if let price = item.salePrice, let p = Double(price) {
                    Text(APIConfig.formatMoney(p)).font(.headline).monospacedDigit()
                }
            }
            HStack(spacing: 6) {
                if let loc = item.location {
                    StatusBadge(text: loc.name)
                }
                StatusBadge(text: item.condition, tint: .secondary)
                Spacer()
                if let onAdd {
                    Button(action: onAdd) {
                        Label("Kassaga", systemImage: "cart.badge.plus")
                    }
                    .buttonStyle(.borderedProminent)
                }
            }
        }
        .padding(.vertical, 4)
    }
}
