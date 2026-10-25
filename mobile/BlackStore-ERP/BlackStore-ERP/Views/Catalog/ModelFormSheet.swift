import SwiftUI

/// Add or edit sheet for a product model: name and optional low-stock threshold (FR-4).
struct ModelFormSheet: View {
    @ObservedObject var viewModel: CategoriesViewModel
    let categoryId: Int
    /// nil = add a new model.
    let model: ProductModel?
    @State private var name: String
    @State private var thresholdText: String
    @State private var nameEdited = false

    init(viewModel: CategoriesViewModel, categoryId: Int, model: ProductModel?) {
        self.viewModel = viewModel
        self.categoryId = categoryId
        self.model = model
        _name = State(initialValue: model?.name ?? "")
        _thresholdText = State(initialValue: model?.lowStockThreshold.map(String.init) ?? "")
    }

    private var trimmedName: String { name.trimmingCharacters(in: .whitespacesAndNewlines) }
    private var nameError: String? {
        if trimmedName.isEmpty { return "Model nomini kiriting" }
        return trimmedName.utf16.count > 100 ? "Ko'pi bilan 100 ta belgi" : nil
    }
    /// Empty = no alert (null); otherwise a positive whole number, like the web schema.
    private var threshold: Int? { Int32(thresholdText).map(Int.init) }
    private var thresholdError: String? {
        thresholdText.isEmpty || (threshold ?? 0) >= 1 ? nil : "Chegara musbat butun son bo'lishi kerak"
    }

    var body: some View {
        Group {
            Section {
                TextField("Model nomini kiriting", text: $name)
                    .onChange(of: name) { nameEdited = true }
                if nameEdited, let nameError { InlineMessage(text: nameError, font: .caption) }
            } header: { Text("Model nomi") }
            Section {
                TextField("Ogohlantirish kerak bo'lmasa, bo'sh qoldiring", text: $thresholdText)
                    .keyboardType(.numberPad)
                    .monospacedDigit()
                if let thresholdError { InlineMessage(text: thresholdError, font: .caption) }
            } header: { Text("Kam qolish chegarasi") }
        }
        .formSheet(
            title: model == nil ? "Model qo'shish" : "Modelni tahrirlash",
            canSave: nameError == nil && thresholdError == nil,
            isSaving: viewModel.isSaving,
            save: save
        )
    }

    /// Sends create or update; empty threshold goes as null so it clears.
    private func save() async throws {
        let value = thresholdText.isEmpty ? nil : threshold
        if let model {
            try await viewModel.updateModel(
                id: model.id, categoryId: categoryId, ProductModelPayload(name: trimmedName, lowStockThreshold: value)
            )
        } else {
            try await viewModel.createModel(
                categoryId: categoryId,
                ProductModelPayload(categoryId: categoryId, name: trimmedName, lowStockThreshold: value)
            )
        }
    }
}
