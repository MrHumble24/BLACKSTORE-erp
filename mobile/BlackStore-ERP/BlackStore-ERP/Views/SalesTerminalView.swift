import SwiftUI

/// Main POS terminal view for scanning devices, trade-ins, inventory search, and processing sales.
public struct SalesTerminalView: View {
    @StateObject private var cartViewModel = CartViewModel()
    @State private var manualCodeInput: String = ""
    @State private var isShowingScannerSheet: Bool = false
    @State private var isShowingAccessorySheet: Bool = false
    @State private var isShowingCheckoutSheet: Bool = false
    @State private var isShowingInspectorSheet: Bool = false
    @State private var isShowingInventoryLookup: Bool = false
    @State private var isShowingWalkInSheet: Bool = false
    @State private var isShowingDevPanel: Bool = false
    @State private var completedSale: Sale? = nil

    public init() {}

    public var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                topActionStrip

                if let err = cartViewModel.errorMessage {
                    bannerView(text: err, color: .red)
                }

                if let succ = cartViewModel.successMessage {
                    bannerView(text: succ, color: .green)
                }

                if cartViewModel.lines.isEmpty {
                    emptyCartPlaceholder
                } else {
                    cartList
                }

                if !cartViewModel.lines.isEmpty {
                    bottomCheckoutBar
                }
            }
            .navigationTitle("Kassa")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button {
                        isShowingScannerSheet = true
                    } label: {
                        Label("Kamera", systemImage: "barcode.viewfinder")
                    }
                }

                if !cartViewModel.lines.isEmpty {
                    ToolbarItem(placement: .cancellationAction) {
                        Button("Tozalash", role: .destructive) {
                            cartViewModel.clear()
                        }
                    }
                }
            }
            .sheet(isPresented: $isShowingScannerSheet) { cameraScannerSheet }
            .sheet(isPresented: $isShowingAccessorySheet) { accessorySheet }
            .sheet(isPresented: $isShowingCheckoutSheet) { checkoutSheet }
            .sheet(item: $completedSale) { sale in
                ReceiptView(sale: sale) { completedSale = nil }
            }
            .sheet(isPresented: $isShowingDevPanel) { DevPanelView() }
            .sheet(isPresented: $isShowingInspectorSheet) { inspectorSheet }
            .sheet(isPresented: $isShowingInventoryLookup) { inventorySheet }
            .sheet(isPresented: $isShowingWalkInSheet) { walkInSheet }
        }
    }

    private var topActionStrip: some View {
        VStack(spacing: 8) {
            HStack(spacing: 8) {
                TextField("IMEI / Shtrix-kod / S/N", text: $manualCodeInput)
                    .textFieldStyle(.roundedBorder)
                    .textInputAutocapitalization(.characters)
                    .autocorrectionDisabled()
                    .onSubmit { submitManualCode() }

                Button(action: submitManualCode) {
                    if cartViewModel.isScanning {
                        ProgressView().controlSize(.small)
                    } else {
                        Text("Qo'shish")
                    }
                }
                .buttonStyle(.borderedProminent)
                .disabled(manualCodeInput.trimmingCharacters(in: .whitespaces).isEmpty || cartViewModel.isScanning)
            }

            HStack {
                actionBtn("Ombor", icon: "shippingbox") { isShowingInventoryLookup = true }
                Spacer()
                actionBtn("Trade-in", icon: "arrow.triangle.2.circlepath") { isShowingWalkInSheet = true }
                Spacer()
                actionBtn("Aksessuar", icon: "plus.circle") { isShowingAccessorySheet = true }
                Spacer()
                actionBtn("Tekshirish", icon: "info.circle") { isShowingInspectorSheet = true }
                Spacer()
                actionBtn("Kamera", icon: "camera.fill") { isShowingScannerSheet = true }
            }
        }
        .padding(12)
        .background(Color(.secondarySystemBackground))
        .contentShape(Rectangle())
        .onTapGesture(count: 3) {
            isShowingDevPanel = true
            HapticManager.success()
        }
    }

    private func actionBtn(_ title: String, icon: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Label(title, systemImage: icon).font(.caption2)
        }
    }

    private var cartList: some View {
        ScrollView {
            LazyVStack(spacing: 10) {
                ForEach(cartViewModel.lines) { line in
                    CartLineRow(
                        line: line,
                        onPriceChange: { p in _ = cartViewModel.updatePrice(for: line.id, newPrice: p) },
                        onQuantityChange: { q in cartViewModel.updateQuantity(for: line.id, quantity: q) },
                        onDelete: { cartViewModel.removeLine(id: line.id) }
                    )
                }
            }
            .padding()
        }
    }

    private var emptyCartPlaceholder: some View {
        ContentUnavailableView(
            "Savatcha bo'sh",
            systemImage: "barcode.viewfinder",
            description: Text("Mahsulot shtrix-kodini skanerlang, ombordan tanlang yoki trade-in orqali qabul qiling.")
        )
    }

    private var bottomCheckoutBar: some View {
        VStack(spacing: 8) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("\(cartViewModel.totalUnitsCount) dona mahsulot")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Text(cartViewModel.formattedTotal)
                        .font(.title2)
                        .fontWeight(.bold)
                }
                Spacer()
                Button { isShowingCheckoutSheet = true } label: {
                    Text("To'lovga o'tish")
                        .font(.headline)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 8)
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.large)
                .disabled(!cartViewModel.allPricesValid)
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .overlay(Divider(), alignment: .top)
    }

    private var cameraScannerSheet: some View {
        NavigationStack {
            VisionScannerView { code in
                Task {
                    if await cartViewModel.scanCode(code) {
                        isShowingScannerSheet = false
                    }
                }
            }
            .navigationTitle("Shtrix-kod skaner")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Yopish") { isShowingScannerSheet = false }
                }
            }
        }
    }

    private var accessorySheet: some View {
        AccessoryPickerSheet { id, name, price in
            cartViewModel.addAccessory(modelId: id, name: name, unitPrice: price)
        }
    }

    private var checkoutSheet: some View {
        CheckoutView(cartViewModel: cartViewModel) { sale in
            completedSale = sale
            cartViewModel.clear()
        }
    }

    private var inspectorSheet: some View {
        DeviceInspectionSheet { item in
            Task { _ = await cartViewModel.scanCode(item.primaryIdentifier) }
        }
    }

    private var inventorySheet: some View {
        InventoryLookupView { item in
            Task { _ = await cartViewModel.scanCode(item.primaryIdentifier) }
        }
    }

    private var walkInSheet: some View {
        WalkInPurchaseSheet { item in
            cartViewModel.successMessage = "Mijozdan #\(item.id) (\(item.productModel.name)) qabul qilindi!"
        }
    }

    private func submitManualCode() {
        let code = manualCodeInput
        manualCodeInput = ""
        Task { _ = await cartViewModel.scanCode(code) }
    }

    private func bannerView(text: String, color: Color) -> some View {
        Text(text)
            .font(.caption)
            .foregroundStyle(.white)
            .padding(8)
            .frame(maxWidth: .infinity)
            .background(color)
    }
}
