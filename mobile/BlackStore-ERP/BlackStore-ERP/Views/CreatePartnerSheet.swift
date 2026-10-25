import SwiftUI

/// Modal sheet to register a new partner shop (FR-26).
public struct CreatePartnerSheet: View {
    @Environment(\.dismiss) private var dismiss
    @ObservedObject public var viewModel: PartnersViewModel

    @State private var name: String = ""
    @State private var phone: String = ""
    @State private var marketLocation: String = ""
    @State private var note: String = ""
    @State private var isSubmitting: Bool = false

    public init(viewModel: PartnersViewModel) {
        self.viewModel = viewModel
    }

    public var body: some View {
        NavigationStack {
            Form {
                Section("Hamkor do'kon") {
                    TextField("Do'kon nomi (masalan: iStore Malika)", text: $name)
                    TextField("Telefon raqami", text: $phone)
                        .keyboardType(.phonePad)
                    TextField("Bozor / Joylashuv (masalan: Malika B-24)", text: $marketLocation)
                }

                Section("Izoh (Ixtiyoriy)") {
                    TextField("Masalan: Mas'ul sotuvchi Islom", text: $note)
                }
            }
            .navigationTitle("Yangi hamkor qo'shish")
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
            let ok = await viewModel.createPartner(
                name: name,
                phone: phone,
                marketLocation: marketLocation.isEmpty ? nil : marketLocation,
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
