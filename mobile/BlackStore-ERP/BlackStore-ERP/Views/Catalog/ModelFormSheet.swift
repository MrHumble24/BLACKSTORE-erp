import SwiftUI

/// Add or edit sheet for a product model: name and optional low-stock threshold (FR-4).
struct ModelFormSheet: View {
    @ObservedObject var viewModel: CategoriesViewModel
    let categoryId: Int
    /// nil = add a new model.
    let model: ProductModel?
    @Environment(\.dismiss) private var dismiss
    @State private var name: String
    @State private var thresholdText: String

    init(viewModel: CategoriesViewModel, categoryId: Int, model: ProductModel?) {
        self.viewModel = viewModel
        self.categoryId = categoryId
        self.model = model
        _name = State(initialValue: model?.name ?? "")
        _thresholdText = State(initialValue: model?.lowStockThreshold.map(String.init) ?? "")
    }

    private var trimmedName: String { name.trimmingCharacters(in: .whitespacesAndNewlines) }
    private var nameError: String? { trimmedName.count > 100 ? "Ko'pi bilan 100 ta belgi" : nil }
    /// Empty = no alert; otherwise a whole number 0 or more.
    private var threshold: Int? { Int32(thresholdText).map(Int.init) }
    private var thresholdError: String? {
        thresholdText.isEmpty || (threshold ?? -1) >= 0 ? nil : "Chegara 0 yoki undan katta butun son bo'lishi kerak"
    }
    private var isValid: Bool { !trimmedName.isEmpty && nameError == nil && thresholdError == nil }

    var body: some View {
        NavigationStack {
            Form {
                if let err = viewModel.errorMessage {
                    Section { InlineMessage(text: err) }
                }
                Section {
                    TextField("Model nomini kiriting", text: $name)
                    if let nameError { InlineMessage(text: nameError, font: .caption) }
                } header: { Text("Model nomi") }
                Section {
                    TextField("Ogohlantirish kerak bo'lmasa, bo'sh qoldiring", text: $thresholdText)
                        .keyboardType(.numberPad)
                        .monospacedDigit()
                    if let thresholdError { InlineMessage(text: thresholdError, font: .caption) }
                } header: {
                    Text("Kam qolish chegarasi")
                } footer: {
                    Text("0 yoki bo'sh = ogohlantirish yo'q")
                }
            }
            .navigationTitle(model == nil ? "Model qo'shish" : "Modelni tahrirlash")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Bekor qilish") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Saqlash") { Task { await save() } }
                        .disabled(!isValid || viewModel.isSaving)
                }
            }
            .keyboardDoneBar()
        }
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.visible)
        .onAppear { viewModel.errorMessage = nil }
        .onDisappear { viewModel.errorMessage = nil }
    }

    /// Sends create or update and closes on success; empty threshold is sent as null to clear it.
    private func save() async {
        let value = thresholdText.isEmpty ? nil : threshold
        let ok = if let model {
            await viewModel.updateModel(
                id: model.id, categoryId: categoryId,
                ProductModelPayload(name: trimmedName, lowStockThreshold: value)
            )
        } else {
            await viewModel.createModel(
                ProductModelPayload(categoryId: categoryId, name: trimmedName, lowStockThreshold: value)
            )
        }
        if ok { dismiss() }
    }
}
