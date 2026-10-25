import SwiftUI

/// Modal sheet to create a new supplier (FR-16).
public struct CreateSupplierSheet: View {
    @Environment(\.dismiss) private var dismiss
    @ObservedObject public var viewModel: SuppliersViewModel

    @State private var name: String = ""
    @State private var contactInfo: String = ""
    @State private var isSubmitting: Bool = false

    public init(viewModel: SuppliersViewModel) {
        self.viewModel = viewModel
    }

    public var body: some View {
        NavigationStack {
            Form {
                Section("Yetkazib beruvchi") {
                    TextField("Nomi (masalan: Dubai Tech FZE)", text: $name)
                    TextField("Kontakt / Telefon / Manzil", text: $contactInfo)
                }
            }
            .navigationTitle("Yangi yetkazib beruvchi")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Bekor qilish") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Saqlash") { submit() }
                        .disabled(name.trimmingCharacters(in: .whitespaces).isEmpty || isSubmitting)
                }
            }
        }
    }

    private func submit() {
        isSubmitting = true
        HapticManager.medium()

        Task {
            let ok = await viewModel.createSupplier(
                name: name,
                contactInfo: contactInfo.isEmpty ? nil : contactInfo
            )
            isSubmitting = false
            if ok {
                HapticManager.success()
                dismiss()
            } else {
                HapticManager.error()
            }
        }
    }
}
