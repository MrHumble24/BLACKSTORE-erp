import SwiftUI

/// Modal sheet to create a new staff account (FR-29).
public struct CreateUserSheet: View {
    @Environment(\.dismiss) private var dismiss
    @ObservedObject public var viewModel: UsersViewModel

    @State private var name: String = ""
    @State private var phone: String = ""
    @State private var password: String = ""
    @State private var selectedRoleId: Int = 2 // 2 = Staff by default, 1 = Admin
    @State private var isSubmitting: Bool = false

    public init(viewModel: UsersViewModel) {
        self.viewModel = viewModel
    }

    public var body: some View {
        NavigationStack {
            Form {
                Section("Xodim ma'lumotlari") {
                    TextField("F.I.SH", text: $name)
                    TextField("Telefon (masalan: +998901234567)", text: $phone)
                        .keyboardType(.phonePad)
                    SecureField("Parol", text: $password)
                }

                Section("Rol") {
                    Picker("Rolni tanlang", selection: $selectedRoleId) {
                        Text("Staff (Sotuvchi & Omborchi)").tag(2)
                        Text("Admin (Boshqaruvchi)").tag(1)
                    }
                }
            }
            .navigationTitle("Yangi xodim ochish")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Bekor qilish") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Saqlash") { submit() }
                        .disabled(name.trimmingCharacters(in: .whitespaces).isEmpty ||
                                  phone.trimmingCharacters(in: .whitespaces).isEmpty ||
                                  password.count < 4 ||
                                  isSubmitting)
                }
            }
        }
    }

    private func submit() {
        isSubmitting = true
        HapticManager.medium()

        Task {
            let ok = await viewModel.createUser(
                name: name,
                phone: phone,
                password: password,
                roleId: selectedRoleId
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
