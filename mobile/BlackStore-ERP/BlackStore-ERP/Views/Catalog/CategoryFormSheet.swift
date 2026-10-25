import SwiftUI

/// Create or edit sheet for a category: name, serialized switch and (edit only) active toggle.
struct CategoryFormSheet: View {
    @ObservedObject var viewModel: CategoriesViewModel
    /// nil = create a new category.
    let category: CategoryItem?
    @Environment(\.dismiss) private var dismiss
    @State private var name: String
    @State private var isSerialized: Bool
    @State private var isActive: Bool

    init(viewModel: CategoriesViewModel, category: CategoryItem? = nil) {
        self.viewModel = viewModel
        self.category = category
        _name = State(initialValue: category?.name ?? "")
        _isSerialized = State(initialValue: category?.isSerialized ?? true)
        _isActive = State(initialValue: category?.isActive ?? true)
    }

    private var trimmedName: String { name.trimmingCharacters(in: .whitespacesAndNewlines) }
    private var nameError: String? { trimmedName.count > 100 ? "Ko'pi bilan 100 ta belgi" : nil }
    private var isValid: Bool { !trimmedName.isEmpty && nameError == nil }

    var body: some View {
        NavigationStack {
            Form {
                if let err = viewModel.errorMessage {
                    Section { InlineMessage(text: err) }
                }
                Section {
                    TextField("Kategoriya nomini kiriting", text: $name)
                    if let nameError { InlineMessage(text: nameError, font: .caption) }
                } header: { Text("Nomi") }
                Section {
                    Toggle("Seriya raqamli", isOn: $isSerialized)
                } footer: {
                    Text("Seriya raqamli mahsulotlar IMEI yoki seriya raqami bo'yicha donabay hisoblanadi")
                }
                if category != nil {
                    Section { Toggle("Faol", isOn: $isActive) }
                }
            }
            .navigationTitle(category == nil ? "Kategoriya qo'shish" : "Kategoriyani tahrirlash")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Bekor qilish") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Saqlash") { Task { await save() } }
                        .disabled(!isValid || viewModel.isSaving)
                }
            }
        }
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.visible)
        .onAppear { viewModel.errorMessage = nil }
        .onDisappear { viewModel.errorMessage = nil }
    }

    /// Sends create or update and closes on success.
    private func save() async {
        let ok: Bool
        if let category {
            ok = await viewModel.updateCategory(
                id: category.id,
                UpdateCategoryPayload(name: trimmedName, isSerialized: isSerialized, isActive: isActive)
            )
        } else {
            ok = await viewModel.createCategory(CreateCategoryPayload(name: trimmedName, isSerialized: isSerialized))
        }
        if ok { dismiss() }
    }
}
