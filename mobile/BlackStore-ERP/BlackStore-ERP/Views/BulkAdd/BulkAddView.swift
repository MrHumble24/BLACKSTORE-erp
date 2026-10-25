import SwiftUI

/// Bulk add devices (web /items/bulk-add, F19): set the model, owner and place once, paste or scan
/// many IMEI / serial codes, and each code becomes one device.
/// Push it inside a NavigationStack: `BulkAddView(user: currentUser)`.
struct BulkAddView: View {
    @StateObject private var vm: BulkAddViewModel
    private let canReceive: Bool
    @State private var isScanning = false
    @State private var scanFeedback: ScanFeedback?

    /// `user` decides access: receive_batch to open, manage_prices for prices, view_cost for purchase price.
    init(user: User) {
        canReceive = user.hasPermission("receive_batch")
        _vm = StateObject(wrappedValue: BulkAddViewModel(access: BulkAddAccess(
            canManagePrices: user.hasPermission("manage_prices"),
            canViewCost: user.hasPermission("view_cost")
        )))
    }

    var body: some View {
        content
            .navigationTitle("Ommaviy qo'shish")
            .navigationBarTitleDisplayMode(.inline)
            // Leaving mid-run would hide which codes were saved, so the way back waits for the run.
            .navigationBarBackButtonHidden(vm.phase == .sending)
            .interactiveDismissDisabled(vm.phase == .sending)
            .task {
                if canReceive && vm.categories.isEmpty { await vm.load() }
            }
            .sheet(isPresented: $isScanning, onDismiss: { scanFeedback = nil; vm.scannerClosed() }) {
                ScannerSheet(title: "Kodlarni skanerlash", count: vm.scannedDevices, feedback: scanFeedback) { code in
                    scanFeedback = vm.scanned(code)
                }
            }
    }

    @ViewBuilder
    private var content: some View {
        if !canReceive {
            MessagePanel(
                title: "Ruxsat yo'q",
                systemImage: "lock",
                message: "Qurilma qo'shish uchun qabul qilish huquqi kerak"
            )
        } else if vm.isLoading && vm.categories.isEmpty {
            LoadingState()
        } else if let error = vm.loadError, vm.categories.isEmpty {
            ErrorState(message: error) { await vm.load() }
        } else if vm.phase == .editing {
            BulkAddFormView(vm: vm) { isScanning = true }
        } else {
            BulkAddResultsView(vm: vm)
        }
    }
}
