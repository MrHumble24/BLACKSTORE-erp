import SwiftUI

/// Create or edit sheet for a category: name and serialized switch, like the web form.
struct CategoryFormSheet: View {
    @ObservedObject var viewModel: CategoriesViewModel
    /// nil = create a new category.
    let category: CategoryItem?
    @State private var name: String
    @State private var isSerialized: Bool
    @State private var nameEdited = false

    init(viewModel: CategoriesViewModel, category: CategoryItem? = nil) {
        self.viewModel = viewModel
        self.category = category
        _name = State(initialValue: category?.name ?? "")
        _isSerialized = State(initialValue: category?.isSerialized ?? true)
    }

    private var trimmedName: String { name.trimmingCharacters(in: .whitespacesAndNewlines) }
    private var nameError: String? {
        if trimmedName.isEmpty { return "Ismni kiriting" }
        return trimmedName.utf16.count > 100 ? "Ko'pi bilan 100 ta belgi" : nil
    }

    var body: some View {
        Group {
            Section {
                TextField("Kategoriya nomini kiriting", text: $name)
                    .onChange(of: name) { nameEdited = true }
                if nameEdited, let nameError { InlineMessage(text: nameError, font: .caption) }
            } header: { Text("Nomi") }
            Section {
                Toggle("Seriya raqamli", isOn: $isSerialized)
            } footer: {
                Text("Seriya raqamli mahsulotlar IMEI yoki seriya raqami bo'yicha donabay hisoblanadi")
            }
        }
        .formSheet(
            title: category == nil ? "Kategoriya qo'shish" : "Kategoriyani tahrirlash",
            canSave: nameError == nil,
            isSaving: viewModel.isSaving,
            save: save
        )
    }

    /// Sends create or update; throws so the sheet shows the error.
    private func save() async throws {
        if let category {
            try await viewModel.updateCategory(
                id: category.id, UpdateCategoryPayload(name: trimmedName, isSerialized: isSerialized)
            )
        } else {
            try await viewModel.createCategory(CreateCategoryPayload(name: trimmedName, isSerialized: isSerialized))
        }
    }
}
