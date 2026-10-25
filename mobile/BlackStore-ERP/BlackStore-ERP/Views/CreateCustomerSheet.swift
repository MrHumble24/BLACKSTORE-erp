import SwiftUI

/// Modal sheet to create a new customer (FR-21).
public struct CreateCustomerSheet: View {
    @Environment(\.dismiss) private var dismiss
    @ObservedObject public var viewModel: CustomersViewModel

    @State private var name: String = ""
    @State private var phone: String = ""
    @State private var note: String = ""
    @State private var isSubmitting: Bool = false

    public init(viewModel: CustomersViewModel) {
        self.viewModel = viewModel
    }

    public var body: some View {
        NavigationStack {
            Form {
                Section("Mijoz ma'lumotlari") {
                    TextField("F.I.SH / Ism", text: $name)
                    TextField("Telefon raqami (masalan: +998901234567)", text: $phone)
                        .keyboardType(.phonePad)
                }

                Section("Izoh (Ixtiyoriy)") {
                    TextField("Doimiy mijoz, Telegram @username va h.k.", text: $note)
                }
            }
            .navigationTitle("Yangi mijoz qo'shish")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Bekor qilish") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Saqlash") { submit() }
                        .disabled(name.trimmingCharacters(in: .whitespaces).isEmpty ||
                                  phone.trimmingCharacters(in: .whitespaces).isEmpty ||
                                  isSubmitting)
                }
            }
        }
    }

    private func submit() {
        isSubmitting = true
        HapticManager.medium()

        Task {
            let ok = await viewModel.createCustomer(
                name: name,
                phone: phone,
                note: note.isEmpty ? nil : note
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
