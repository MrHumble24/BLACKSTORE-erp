import SwiftUI

/// Accessory stock list body: first-load, error and empty states, rows grouped by category, paging.
struct AccessoriesList: View {
    @ObservedObject var viewModel: AccessoryStockAdminViewModel
    let canViewCost: Bool
    /// nil when the user may not receive stock; the preset is nil for "no row picked".
    let onAddStock: ((AccessoryStockPreset?) -> Void)?
    let onNewModel: (() -> Void)?

    /// Category name with its rows, in server order (model name).
    private struct CategoryGroup: Identifiable {
        let category: AccessoryRef
        let rows: [AccessoryStockRow]
        var id: Int { category.id }
    }

    private var groups: [CategoryGroup] {
        Dictionary(grouping: viewModel.rows, by: \.productModel.category)
            .map { CategoryGroup(category: $0.key, rows: $0.value) }
            .sorted { $0.category.name.localizedStandardCompare($1.category.name) == .orderedAscending }
    }

    var body: some View {
        if !viewModel.hasLoaded && viewModel.errorMessage == nil {
            LoadingState()
        } else if !viewModel.hasLoaded, let error = viewModel.errorMessage {
            ErrorState(message: error) { await viewModel.reload() }
        } else {
            list
        }
    }

    private var list: some View {
        List {
            if let error = viewModel.errorMessage {
                Section { InlineMessage(text: error) }
            }
            if let notice = viewModel.notice {
                Section { InlineMessage(text: notice, isError: false) }
            }
            if viewModel.rows.isEmpty {
                Section { emptyState }
            }
            ForEach(groups) { group in
                Section(group.category.name) {
                    ForEach(group.rows) { row($0) }
                }
            }
            if viewModel.hasMore {
                Section { nextPageRow }
            }
        }
        .listStyle(.insetGrouped)
        .refreshable { await viewModel.refresh() }
    }

    /// Spinner that loads the next page when it appears, or the error with a retry.
    @ViewBuilder
    private var nextPageRow: some View {
        if let error = viewModel.loadMoreError {
            InlineMessage(text: error)
            Button("Qayta urinish") { Task { await viewModel.loadMore() } }
        } else {
            ProgressView()
                .frame(maxWidth: .infinity)
                .task(id: viewModel.rows.count) { await viewModel.loadMore() }
        }
    }

    private func row(_ row: AccessoryStockRow) -> some View {
        AccessoryStockRowView(row: row, showsCost: canViewCost)
            .swipeActions(edge: .trailing) { addButton(row).tint(.accentColor) }
            .contextMenu { addButton(row) }
    }

    /// "Kirim qilish" for one row, shared by the swipe action and the context menu.
    @ViewBuilder
    private func addButton(_ row: AccessoryStockRow) -> some View {
        if let onAddStock {
            Button("Kirim qilish", systemImage: "plus") { onAddStock(preset(row)) }
        }
    }

    private func preset(_ row: AccessoryStockRow) -> AccessoryStockPreset {
        AccessoryStockPreset(categoryId: row.productModel.category.id, modelId: row.productModel.id, locationId: row.location.id)
    }

    /// Filtered or truly empty, each with the action that helps.
    @ViewBuilder
    private var emptyState: some View {
        if viewModel.filters.isActive {
            MessagePanel(title: "Aksessuarlar topilmadi", systemImage: "line.3.horizontal.decrease.circle") {
                Button("Filtrlarni tozalash") { viewModel.filters = AccessoryStockFilters() }
                    .buttonStyle(.bordered)
            }
        } else {
            MessagePanel(
                title: "Aksessuarlar topilmadi",
                systemImage: "shippingbox",
                message: "Seriya raqamisiz mahsulotlar va qoldiqlar hisobi"
            ) {
                emptyActions
            }
        }
    }

    @ViewBuilder
    private var emptyActions: some View {
        if let onAddStock {
            Button("Kirim qilish") { onAddStock(nil) }
                .buttonStyle(.borderedProminent)
        } else if let onNewModel {
            Button("Yangi aksessuar", action: onNewModel)
                .buttonStyle(.borderedProminent)
        }
    }
}
