import SwiftUI

/// Receipt customization settings view (FR-24).
public struct ReceiptSettingsView: View {
    @StateObject private var viewModel = ReceiptSettingsViewModel()

    public init() {}

    public var body: some View {
        Form {
            if let err = viewModel.errorMessage {
                Section { Text(err).font(.caption).foregroundStyle(.red) }
            }
            if let succ = viewModel.successMessage {
                Section { Text(succ).font(.caption).foregroundStyle(.green) }
            }

            brandingSection
            fieldTogglesSection
        }
        .navigationTitle("Chek sozlamalari")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .confirmationAction) {
                Button("Saqlash") {
                    Task {
                        let ok = await viewModel.saveSettings()
                        if ok { HapticManager.success() }
                    }
                }
                .disabled(viewModel.isLoading)
            }
        }
        .task { await viewModel.fetchSettings() }
        .refreshable { await viewModel.fetchSettings() }
    }

    private var brandingSection: some View {
        Section("Do'kon ma'lumotlari") {
            TextField("Do'kon nomi", text: $viewModel.shopName)
            TextField("Manzil", text: $viewModel.address)
            TextField("Telefon raqami", text: $viewModel.phone)
                .keyboardType(.phonePad)
            TextField("Sarlavha ostidagi eslatma", text: $viewModel.headerNote)
            TextField("Chek ostidagi matn (Footer)", text: $viewModel.footer)
        }
    }

    private var fieldTogglesSection: some View {
        Section("Chekda ko'rsatiladigan elementlar") {
            Toggle("Sarlavha eslatmasi", isOn: $viewModel.showHeaderNote)
            Toggle("Manzil", isOn: $viewModel.showAddress)
            Toggle("Telefon", isOn: $viewModel.showPhone)
            Toggle("Mijoz ma'lumotlari", isOn: $viewModel.showCustomer)
            Toggle("Kafolat muddati", isOn: $viewModel.showWarranty)
            Toggle("Chek osti matni (Footer)", isOn: $viewModel.showFooter)
        }
    }
}
