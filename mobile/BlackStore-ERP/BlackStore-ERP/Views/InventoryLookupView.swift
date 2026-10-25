import SwiftUI

/// Inventory lookup view for browsing in-stock devices with branch availability (PRD FR-12).
public struct InventoryLookupView: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var viewModel = InventoryLookupViewModel()
    public let onAddToCart: ((Item) -> Void)?

    public init(onAddToCart: ((Item) -> Void)? = nil) {
        self.onAddToCart = onAddToCart
    }

    public var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                if !viewModel.locations.isEmpty {
                    locationFilterPicker
                }

                if viewModel.isLoading && viewModel.items.isEmpty {
                    Spacer()
                    ProgressView("Yuklanmoqda...")
                    Spacer()
                } else if viewModel.items.isEmpty {
                    emptyState
                } else {
                    itemsList
                }
            }
            .navigationTitle("Ombor (Mavjud tovarlar)")
            .navigationBarTitleDisplayMode(.inline)
            .searchable(text: $viewModel.searchText, prompt: "Model, IMEI yoki Seriya raqami...")
            .onChange(of: viewModel.searchText) {
                Task { await viewModel.fetchItems() }
            }
            .onChange(of: viewModel.selectedLocation) {
                Task { await viewModel.fetchItems() }
            }
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Yopish") { dismiss() }
                }
            }
            .task {
                await viewModel.fetchLocations()
                await viewModel.fetchItems()
            }
        }
    }

    private var locationFilterPicker: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                FilterChip(
                    title: "Barchasi",
                    isSelected: viewModel.selectedLocation == nil
                ) {
                    viewModel.selectedLocation = nil
                }

                ForEach(viewModel.locations) { loc in
                    FilterChip(
                        title: loc.name,
                        isSelected: viewModel.selectedLocation?.id == loc.id
                    ) {
                        viewModel.selectedLocation = loc
                    }
                }
            }
            .padding(.horizontal)
            .padding(.vertical, 8)
        }
        .background(Color(.secondarySystemBackground))
    }

    private var itemsList: some View {
        List(viewModel.items) { item in
            VStack(alignment: .leading, spacing: 8) {
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(item.productModel.name)
                            .font(.headline)

                        Text(item.primaryIdentifier)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }

                    Spacer()

                    if let price = item.salePrice, let p = Double(price) {
                        Text(APIConfig.formatMoney(p))
                            .font(.headline)
                            .foregroundStyle(.blue)
                    }
                }

                HStack(spacing: 6) {
                    if let loc = item.location {
                        badgeView(text: loc.name, color: .purple)
                    }

                    badgeView(text: item.condition, color: .orange)

                    Spacer()

                    if let onAddToCart = onAddToCart {
                        Button {
                            onAddToCart(item)
                            HapticManager.success()
                            dismiss()
                        } label: {
                            Label("Kassaga", systemImage: "cart.badge.plus")
                                .font(.caption)
                        }
                        .buttonStyle(.borderedProminent)
                        .controlSize(.small)
                    }
                }
            }
            .padding(.vertical, 4)
        }
        .listStyle(.plain)
        .refreshable {
            await viewModel.fetchItems()
        }
    }

    private func badgeView(text: String, color: Color) -> some View {
        Text(text)
            .font(.caption2)
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
            .background(color.opacity(0.12))
            .foregroundStyle(color)
            .clipShape(Capsule())
    }

    private var emptyState: some View {
        VStack(spacing: 12) {
            Spacer()
            Image(systemName: "shippingbox")
                .font(.system(size: 48))
                .foregroundStyle(.secondary)
            Text("Omborda tovarlar topilmadi")
                .font(.headline)
                .foregroundStyle(.secondary)
            Spacer()
        }
    }
}

/// Simple filter chip component.
private struct FilterChip: View {
    let title: String
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.caption)
                .fontWeight(isSelected ? .semibold : .regular)
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(isSelected ? Color.accentColor : Color(.systemBackground))
                .foregroundStyle(isSelected ? Color.white : Color.primary)
                .clipShape(Capsule())
        }
    }
}
