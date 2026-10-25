import SwiftUI

/// Main POS screen: scan or type a code, review the cart, then go to payment.
public struct SalesTerminalView: View {
    /// Sheets the terminal can open; only one is shown at a time.
    enum TerminalSheet: String, Identifiable {
        case scanner, accessory, checkout, inspector, inventory, walkIn
        #if DEBUG
        case devPanel
        #endif
        var id: String { rawValue }
    }

    @StateObject private var cartViewModel = CartViewModel()
    @State private var activeSheet: TerminalSheet?
    @State private var completedSale: Sale?
    @State private var isConfirmingClear = false

    public init() {}

    public var body: some View {
        NavigationStack {
            List {
                TerminalCodeEntrySection(cartViewModel: cartViewModel, open: { activeSheet = $0 })
                if cartViewModel.lines.isEmpty {
                    emptyCart
                } else {
                    cartSection
                }
            }
            .listStyle(.insetGrouped)
            .navigationTitle("Kassa")
            .salesKeyboardDoneBar()
            .safeAreaInset(edge: .bottom) {
                CartTotalBar(cartViewModel: cartViewModel) { activeSheet = .checkout }
            }
            .toolbar { toolbarContent }
            .confirmationDialog("Savatchani tozalash?", isPresented: $isConfirmingClear, titleVisibility: .visible) {
                Button("Tozalash", role: .destructive) { cartViewModel.clear() }
            }
            .sheet(item: $activeSheet) { sheetContent(for: $0) }
            .sheet(item: $completedSale) { sale in
                ReceiptView(sale: sale) { completedSale = nil }
            }
        }
    }

    @ToolbarContentBuilder
    private var toolbarContent: some ToolbarContent {
        if !cartViewModel.lines.isEmpty {
            ToolbarItem(placement: .topBarLeading) {
                Button("Tozalash", role: .destructive) { isConfirmingClear = true }
                    .tint(.red)
            }
        }
        ToolbarItem(placement: .primaryAction) {
            Button { activeSheet = .scanner } label: {
                Label("Skanerlash", systemImage: "barcode.viewfinder")
            }
        }
    }

    private var emptyCart: some View {
        Section {
            ContentUnavailableView {
                Label("Savatcha bo'sh", systemImage: "cart")
            } description: {
                Text("Shtrix-kodni skanerlang yoki ombordan tanlang.")
            } actions: {
                Button { activeSheet = .scanner } label: {
                    Label("Skanerlash", systemImage: "barcode.viewfinder")
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.large)
            }
        }
        .listRowBackground(Color.clear)
    }

    private var cartSection: some View {
        Section {
            ForEach(cartViewModel.lines) { line in
                CartLineRow(
                    line: line,
                    onPriceChange: { p in _ = cartViewModel.updatePrice(for: line.id, newPrice: p) },
                    onQuantityChange: { q in cartViewModel.updateQuantity(for: line.id, quantity: q) },
                    onDelete: { cartViewModel.removeLine(id: line.id) }
                )
            }
        } header: {
            Text("Savatcha")
        } footer: {
            Text("Narxni o'zgartirish uchun summaga bosing.")
        }
    }

    @ViewBuilder
    private func sheetContent(for sheet: TerminalSheet) -> some View {
        switch sheet {
        case .scanner:
            SalesScannerSheet(title: "Shtrix-kod skaner", onClose: { activeSheet = nil }) { code in
                Task {
                    if await cartViewModel.scanCode(code) { activeSheet = nil }
                }
            }
        case .accessory:
            AccessoryPickerSheet { id, name, price in
                cartViewModel.addAccessory(modelId: id, name: name, unitPrice: price)
            }
        case .checkout:
            CheckoutView(cartViewModel: cartViewModel) { sale in
                completedSale = sale
                cartViewModel.clear()
            }
        case .inspector:
            DeviceInspectionSheet { item in addToCart(item) }
        case .inventory:
            InventoryLookupView { item in addToCart(item) }
                .presentationDragIndicator(.visible)
        case .walkIn:
            WalkInPurchaseSheet { item in
                cartViewModel.successMessage = "Mijozdan #\(item.id) (\(item.productModel.name)) qabul qilindi!"
            }
        #if DEBUG
        case .devPanel:
            DevPanelView()
                .presentationDragIndicator(.visible)
        #endif
        }
    }

    /// Adds a looked-up device to the cart through the same path as scanning.
    private func addToCart(_ item: Item) {
        Task { _ = await cartViewModel.scanCode(item.primaryIdentifier) }
    }
}
