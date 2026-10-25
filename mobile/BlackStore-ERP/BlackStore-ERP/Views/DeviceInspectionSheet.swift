import SwiftUI

/// Look up a device by code to see its specs and stock status, print a label or add it to the cart.
public struct DeviceInspectionSheet: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var viewModel = DeviceLookupViewModel()
    public let onAddToCart: ((Item) -> Void)?

    @State private var inputCode: String = ""
    @State private var isShowingCamera: Bool = false
    /// System-code-only item for the label sheet, set once the code is ready (or known to be missing).
    @State private var labelItem: Item?
    @State private var isPreparingLabel: Bool = false
    @State private var labelError: String?

    public init(onAddToCart: ((Item) -> Void)? = nil) {
        self.onAddToCart = onAddToCart
    }

    private var canSearch: Bool {
        !inputCode.trimmingCharacters(in: .whitespaces).isEmpty && !viewModel.isLoading
    }

    public var body: some View {
        NavigationStack {
            list
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
            .sheet(item: $labelItem) { BarcodePrintSheet(item: $0) }
            .alert("Tizim kodini yaratib bo'lmadi", isPresented: Binding(
                get: { labelError != nil }, set: { if !$0 { labelError = nil } }
            )) {
                Button("OK", role: .cancel) {}
            } message: {
                Text(labelError ?? "")
            }
        }
        .presentationDetents([.large])
        .presentationDragIndicator(.visible)
    }

    private var list: some View {
        List {
            searchSection
            if let item = viewModel.item {
                DeviceDetailSections(item: item) { printLabel(item) }
                Section {
                    NavigationLink { ItemDetailView(itemId: item.id) } label: {
                        Label("Batafsil", systemImage: "info.circle")
                    }
                }
            } else {
                Section { stateView }.listRowBackground(Color.clear)
            }
        }
        .listStyle(.insetGrouped)
    }

    /// Creates the missing system code when the user may (like the device page), then opens the
    /// label sheet; without the right the sheet itself says "Tizim kodi yo'q".
    private func printLabel(_ item: Item) {
        guard !isPreparingLabel else { return }
        isPreparingLabel = true
        Task {
            defer { isPreparingLabel = false }
            do {
                switch try await SystemCodeLabel.prepare(item) {
                case .ready(let ready): labelItem = ready
                case .noSystemCode: labelItem = item
                }
            } catch {
                labelError = error.localizedDescription
                HapticManager.error()
            }
        }
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
            MessagePanel(title: "Qurilma topilmadi", systemImage: "exclamationmark.magnifyingglass", message: err) {
                Button("Qayta urinish", action: search).buttonStyle(.bordered).disabled(!canSearch)
            }
        } else {
            MessagePanel(title: "Qurilmani skanerlang", systemImage: "magnifyingglass",
                         message: "IMEI yoki seriya raqamini skanerlab, uning to'liq xarakteristikasini ko'ring.")
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
