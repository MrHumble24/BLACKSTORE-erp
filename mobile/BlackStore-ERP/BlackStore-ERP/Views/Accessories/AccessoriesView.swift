import SwiftUI

/// What the add-stock sheet starts with: a row's model and location, or the list's filters.
struct AccessoryStockPreset: Hashable {
    var categoryId: Int?
    var modelId: Int?
    var locationId: Int?
}

/// Which sheet the accessories screen shows.
enum AccessorySheet: Identifiable {
    case addStock(AccessoryStockPreset)
    case newModel

    var id: String {
        if case .addStock(let preset) = self { return "add-\(preset.hashValue)" }
        return "new-model"
    }
}

/// Accessories stock (web `/accessories`, FR-4): list grouped by category, filters,
/// "Kirim qilish" (receive_batch) and "Yangi aksessuar" (manage_catalog).
/// Usage: `AccessoriesView(user: authViewModel.currentUser)` inside a NavigationStack.
struct AccessoriesView: View {
    let user: User
    @StateObject private var viewModel = AccessoryStockAdminViewModel()
    @State private var sheet: AccessorySheet?
    /// Opened when the current sheet closes (new model → add its first stock).
    @State private var nextSheet: AccessorySheet?

    private var canReceive: Bool { user.hasPermission("receive_batch") }
    private var canManageCatalog: Bool { user.hasPermission("manage_catalog") }
    private var canViewCost: Bool { user.hasPermission("view_cost") }
    /// The server takes unitCost only with manage_prices; it is a cost, so it also needs view_cost.
    private var canSetCost: Bool { canViewCost && user.hasPermission("manage_prices") }

    var body: some View {
        AccessoriesList(
            viewModel: viewModel,
            canViewCost: canViewCost,
            onAddStock: canReceive ? { sheet = .addStock($0 ?? filterPreset) } : nil,
            onNewModel: canManageCatalog ? { sheet = .newModel } : nil
        )
        .navigationTitle("Aksessuarlar")
        .navigationSubtitle(subtitle)
        .toolbar { toolbarContent }
        .task {
            guard !viewModel.hasLoaded else { return }
            await viewModel.refresh()
        }
        .onChange(of: viewModel.filters) { Task { await viewModel.applyFilters() } }
        .sheet(item: $sheet, onDismiss: showNextSheet) { sheetContent($0) }
    }

    @ToolbarContentBuilder
    private var toolbarContent: some ToolbarContent {
        ToolbarItem(placement: .topBarTrailing) {
            AccessoryFiltersMenu(
                filters: $viewModel.filters,
                categories: viewModel.categories,
                locations: viewModel.locations
            )
        }
        if canReceive || canManageCatalog {
            ToolbarItem(placement: .primaryAction) { addMenu }
        }
    }

    /// One plus button; a menu only when the user may do both actions.
    @ViewBuilder
    private var addMenu: some View {
        if canReceive && canManageCatalog {
            Menu {
                Button("Kirim qilish", systemImage: "shippingbox") { sheet = .addStock(filterPreset) }
                Button("Yangi aksessuar", systemImage: "tag") { sheet = .newModel }
            } label: {
                Label("Qo'shish", systemImage: "plus")
            }
        } else if canReceive {
            Button("Kirim qilish", systemImage: "plus") { sheet = .addStock(filterPreset) }
        } else {
            Button("Yangi aksessuar", systemImage: "plus") { sheet = .newModel }
        }
    }

    @ViewBuilder
    private func sheetContent(_ sheet: AccessorySheet) -> some View {
        switch sheet {
        case .addStock(let preset):
            AddAccessoryStockSheet(viewModel: viewModel, preset: preset, canSetCost: canSetCost)
        case .newModel:
            NewAccessorySheet(viewModel: viewModel, defaultCategoryId: filterPreset.categoryId) { model, categoryId in
                // A new model has no stock row yet, so go straight to receiving it.
                if canReceive {
                    nextSheet = .addStock(AccessoryStockPreset(
                        categoryId: categoryId, modelId: model.id, locationId: filterPreset.locationId
                    ))
                }
            }
        }
    }

    private func showNextSheet() {
        sheet = nextSheet
        nextSheet = nil
    }

    /// Category and location from the filters, or the only one there is.
    private var filterPreset: AccessoryStockPreset {
        let filters = viewModel.filters
        return AccessoryStockPreset(
            categoryId: filters.categoryId ?? onlyId(viewModel.categories.map(\.id)),
            locationId: filters.locationId ?? onlyId(viewModel.locations.map(\.id))
        )
    }

    private func onlyId(_ ids: [Int]) -> Int? { ids.count == 1 ? ids.first : nil }

    /// Active filters in words, or the row count.
    private var subtitle: String {
        let filters = viewModel.filters
        let parts = [
            filters.locationId.flatMap { id in viewModel.locations.first { $0.id == id }?.name },
            filters.categoryId.flatMap { id in viewModel.categories.first { $0.id == id }?.name },
            filters.level == .all ? nil : filters.level.label,
        ].compactMap { $0 }
        if !parts.isEmpty { return parts.joined(separator: " · ") }
        return viewModel.hasLoaded ? "\(viewModel.total) ta pozitsiya" : ""
    }
}
