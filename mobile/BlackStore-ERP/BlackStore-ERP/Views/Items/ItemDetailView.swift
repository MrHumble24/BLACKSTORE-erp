import SwiftUI

/// Which edit sheet the device page has open.
enum ItemSheet: String, Identifiable {
    case edit, prices, identifier, label
    var id: String { rawValue }
}

/// Device page (web `/items/:id`): info and attributes, identifiers, ownership, prices and transfers.
/// Push it inside a NavigationStack: `ItemDetailView(itemId: 42)`. Edits appear only with the right
/// permission (receive_batch, manage_prices) and cost only with view_cost.
public struct ItemDetailView: View {
    @StateObject private var viewModel: ItemDetailViewModel
    @State private var sheet: ItemSheet?
    /// System-code-only label item, set right before the label sheet opens.
    @State private var labelItem: Item?

    /// - Parameter itemId: the device's id from GET /items.
    public init(itemId: Int) {
        _viewModel = StateObject(wrappedValue: ItemDetailViewModel(itemId: itemId))
    }

    public var body: some View {
        Group {
            if let item = viewModel.item {
                content(item)
            } else if viewModel.isNotFound {
                MessagePanel(title: "Qurilma topilmadi", systemImage: "iphone.slash",
                             message: "Bu qurilma o'chirilgan yoki manzil noto'g'ri.")
            } else if let error = viewModel.loadError, !viewModel.isLoading {
                ErrorState(message: error) { await viewModel.load() }
            } else {
                LoadingState()
            }
        }
        .navigationTitle(viewModel.item?.productModel.name ?? "Qurilma")
        .navigationBarTitleDisplayMode(.inline)
        .task { await viewModel.load() }
    }

    private func content(_ item: ItemDetail) -> some View {
        let rights = viewModel.permissions
        return List {
            if let notice = viewModel.notice {
                Section { InlineMessage(text: notice.text, isError: notice.isError) }
            }
            ItemHeaderSection(item: item)
            ItemInfoSection(item: item, defs: viewModel.attributeDefs, canEdit: rights.canEdit) { sheet = .edit }
            ItemIdentifiersSection(
                item: item, permissions: rights, isSaving: viewModel.isSaving,
                onAdd: { sheet = .identifier }, onPrint: printLabel,
                onGenerate: { Task { await viewModel.generateSystemCode() } }
            )
            ItemOwnershipSection(item: item)
            ItemPricingSection(item: item, permissions: rights) { sheet = .prices }
            ItemTransfersSection(transfers: viewModel.transfers, error: viewModel.transfersError)
        }
        .listStyle(.insetGrouped)
        .refreshable { await viewModel.load() }
        .animation(.default, value: viewModel.notice)
        .sheet(item: $sheet) { sheetView($0, item: item) }
    }

    @ViewBuilder
    private func sheetView(_ which: ItemSheet, item: ItemDetail) -> some View {
        switch which {
        case .edit:
            ItemEditSheet(viewModel: viewModel, item: item, defs: viewModel.attributeDefs)
        case .prices:
            ItemPricesSheet(viewModel: viewModel, item: item, canViewCost: viewModel.permissions.canViewCost)
        case .identifier:
            ItemIdentifierSheet(viewModel: viewModel, types: IdentifierRules.addableTypes(existing: item.identifiers.map(\.type)))
        case .label:
            if let labelItem { BarcodePrintSheet(item: labelItem) }
        }
    }

    /// Creates the system code when missing (the item reloads), then opens the label sheet.
    private func printLabel() {
        Task {
            guard let item = await viewModel.prepareLabel() else { return }
            labelItem = item
            sheet = .label
        }
    }
}
