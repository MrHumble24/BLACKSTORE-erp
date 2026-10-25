import SwiftUI

/// "Yangi aksessuar" sheet: a new product model in an accessory category, with an optional
/// low-stock threshold (POST /product-models, manage_catalog; the caller hides it otherwise).
struct NewAccessorySheet: View {
    @ObservedObject var viewModel: AccessoryStockAdminViewModel
    /// Called after the model is created, with its category, before the sheet closes.
    let onCreated: (ProductModel, Int) -> Void
    @State private var categoryId: Int?
    @State private var name = ""
    @State private var nameEdited = false
    @State private var thresholdText = ""

    init(viewModel: AccessoryStockAdminViewModel, defaultCategoryId: Int?, onCreated: @escaping (ProductModel, Int) -> Void) {
        self.viewModel = viewModel
        self.onCreated = onCreated
        _categoryId = State(initialValue: defaultCategoryId)
    }

    private var nameError: String? { AccessoryStockRules.nameError(name) }
    private var threshold: Int?? { AccessoryStockRules.threshold(thresholdText) }
    private var canSave: Bool { categoryId != nil && nameError == nil && threshold != nil }

    var body: some View {
        Group {
            Section {
                Picker("Kategoriya", selection: $categoryId) {
                    Text("Tanlang").tag(Int?.none)
                    ForEach(viewModel.categories) { Text($0.name).tag(Optional($0.id)) }
                }
                if viewModel.categories.isEmpty {
                    Text("Seriya raqamisiz kategoriya yo'q. Avval uni Kategoriyalar bo'limida yarating.")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
            Section("Model nomi") {
                TextField("Model nomini kiriting", text: $name)
                    .onChange(of: name) { nameEdited = true }
                if nameEdited, let nameError { InlineMessage(text: nameError, font: .caption) }
            }
            Section {
                TextField("Ogohlantirish kerak bo'lmasa, bo'sh qoldiring", text: $thresholdText)
                    .keyboardType(.numberPad)
                    .monospacedDigit()
                if threshold == nil { InlineMessage(text: "Chegara musbat butun son bo'lishi kerak", font: .caption) }
            } header: {
                Text("Kam qolish chegarasi")
            }
        }
        .formSheet(title: "Yangi aksessuar", canSave: canSave, isSaving: viewModel.isSaving, save: save)
    }

    private func save() async throws {
        guard let categoryId, let threshold else { return }
        let payload = ProductModelPayload(
            categoryId: categoryId,
            name: name.trimmingCharacters(in: .whitespacesAndNewlines),
            lowStockThreshold: threshold
        )
        let model = try await viewModel.createModel(payload)
        onCreated(model, categoryId)
    }
}
