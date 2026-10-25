import SwiftUI

/// Sheet to buy a device from a walk-in seller or take it as a trade-in (PRD FR-25).
public struct WalkInPurchaseSheet: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var viewModel = WalkInPurchaseViewModel()
    @State private var isShowingScanner: Bool = false
    public let onPurchaseCompleted: (Item) -> Void

    public init(onPurchaseCompleted: @escaping (Item) -> Void) {
        self.onPurchaseCompleted = onPurchaseCompleted
    }

    /// Required fields are filled; the view model still runs the full validation on submit.
    private var isFormFilled: Bool {
        !viewModel.sellerName.trimmingCharacters(in: .whitespaces).isEmpty
            && !viewModel.identifierValue.trimmingCharacters(in: .whitespaces).isEmpty
            && !viewModel.pricePaid.isEmpty
    }

    public var body: some View {
        NavigationStack {
            Form {
                sellerSection
                WalkInDeviceSection(viewModel: viewModel) { isShowingScanner = true }
                if let err = viewModel.errorMessage {
                    Section {
                        Label(err, systemImage: "exclamationmark.triangle.fill").foregroundStyle(.red)
                        if viewModel.productModels.isEmpty {
                            Button("Qayta urinish") { Task { await viewModel.loadInitialData() } }
                        }
                    }
                }
            }
            .keyboardDoneBar()
            .safeAreaInset(edge: .bottom) {
                BottomBar(
                    title: "Qabul qilish va kirim qilish",
                    isBusy: viewModel.isSubmitting,
                    isDisabled: viewModel.isLoading || !isFormFilled,
                    action: submitPurchase
                )
            }
            .navigationTitle("Mijozdan sotib olish")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Bekor qilish") { dismiss() }
                }
            }
            .sheet(isPresented: $isShowingScanner) {
                ScannerSheet(title: "Shtrix-kod / IMEI skaneri", onClose: { isShowingScanner = false }) { code in
                    viewModel.identifierValue = code
                    HapticManager.scanSuccess()
                    isShowingScanner = false
                }
            }
            .task { await viewModel.loadInitialData() }
        }
        .presentationDetents([.large])
        .presentationDragIndicator(.visible)
        .interactiveDismissDisabled(viewModel.isSubmitting)
    }

    private var sellerSection: some View {
        Section {
            TextField("Ism familiyasi", text: $viewModel.sellerName)
                .textContentType(.name)
            TextField("Telefon raqami", text: $viewModel.sellerPhone)
                .textContentType(.telephoneNumber)
                .keyboardType(.phonePad)
        } header: {
            Text("Mijoz (Sotuvchi)")
        } footer: {
            Text("Qurilmani sotayotgan shaxs.")
        }
    }

    private func submitPurchase() {
        Task {
            let success = await viewModel.submitPurchase()
            if success, let item = viewModel.successItem {
                onPurchaseCompleted(item)
                dismiss()
            }
        }
    }
}
