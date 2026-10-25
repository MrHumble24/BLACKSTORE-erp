import SwiftUI

/// Look up a device by code to see its specs and stock status, print a label or add it to the cart.
public struct DeviceInspectionSheet: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var viewModel = DeviceLookupViewModel()
    public let onAddToCart: ((Item) -> Void)?

    @State private var inputCode: String = ""
    @State private var isShowingCamera: Bool = false
    @State private var isShowingLabelPrint: Bool = false

    public init(onAddToCart: ((Item) -> Void)? = nil) {
        self.onAddToCart = onAddToCart
    }

    private var canSearch: Bool {
        !inputCode.trimmingCharacters(in: .whitespaces).isEmpty && !viewModel.isLoading
    }

    public var body: some View {
        NavigationStack {
            List {
                searchSection
                if let item = viewModel.item {
                    DeviceDetailSections(item: item) { isShowingLabelPrint = true }
                } else {
                    Section { stateView }.listRowBackground(Color.clear)
                }
            }
            .listStyle(.insetGrouped)
            .safeAreaInset(edge: .bottom) { addToCartBar }
            .navigationTitle("Qurilma ma'lumotlari")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Yopish") { dismiss() }
                }
                ToolbarItem(placement: .primaryAction) {
                    Button { isShowingCamera = true } label: {
                        Label("Kamera bilan skanerlash", systemImage: "barcode.viewfinder")
                    }
                }
            }
            .sheet(isPresented: $isShowingCamera) {
                ScannerSheet(title: "Kamerada skanerlash", onClose: { isShowingCamera = false }) { code in
                    inputCode = code
                    isShowingCamera = false
                    Task { _ = await viewModel.lookup(code: code) }
                }
            }
            .sheet(isPresented: $isShowingLabelPrint) {
                if let item = viewModel.item { BarcodePrintSheet(item: item) }
            }
        }
        .presentationDetents([.large])
        .presentationDragIndicator(.visible)
    }

    private var searchSection: some View {
        Section {
            HStack(spacing: 8) {
                TextField("IMEI / Seriya raqami", text: $inputCode)
                    .textInputAutocapitalization(.characters)
                    .autocorrectionDisabled()
                    .submitLabel(.search)
                    .onSubmit(search)
                Button("Qidirish", action: search)
                    .buttonStyle(.borderedProminent)
                    .disabled(!canSearch)
            }
            .frame(minHeight: 44)
        } footer: {
            Text("Kodni kiriting yoki kamera bilan skanerlang.")
        }
    }

    /// Loading, error and "nothing yet" states shown below the search field.
    @ViewBuilder
    private var stateView: some View {
        if viewModel.isLoading {
            ProgressView("Qurilma qidirilmoqda...").frame(maxWidth: .infinity, minHeight: 120)
        } else if let err = viewModel.errorMessage {
            ContentUnavailableView {
                Label("Qurilma topilmadi", systemImage: "exclamationmark.magnifyingglass")
            } description: {
                Text(err)
            } actions: {
                Button("Qayta urinish", action: search).buttonStyle(.bordered).disabled(!canSearch)
            }
        } else {
            ContentUnavailableView(
                "Qurilmani skanerlang",
                systemImage: "magnifyingglass",
                description: Text("IMEI yoki seriya raqamini skanerlab, uning to'liq xarakteristikasini ko'ring.")
            )
        }
    }

    @ViewBuilder
    private var addToCartBar: some View {
        if let onAddToCart, let item = viewModel.item, item.status == "IN_STOCK" {
            BottomBar(title: "Savatchaga qo'shish", systemImage: "cart.badge.plus", isDisabled: false) {
                onAddToCart(item)
                dismiss()
            }
        }
    }

    private func search() {
        guard canSearch else { return }
        Task { _ = await viewModel.lookup(code: inputCode) }
    }
}
