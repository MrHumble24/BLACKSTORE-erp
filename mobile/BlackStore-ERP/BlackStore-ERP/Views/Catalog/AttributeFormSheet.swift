import SwiftUI

/// Add or edit sheet for a category attribute; the key follows the label until the user edits it.
struct AttributeFormSheet: View {
    @ObservedObject var viewModel: CategoriesViewModel
    let categoryId: Int
    /// nil = add a new attribute.
    let attribute: CategoryAttribute?
    @State private var draft: AttributeDraft
    private let initial: AttributeDraft

    init(viewModel: CategoriesViewModel, category: CategoryItem, attribute: CategoryAttribute?) {
        self.viewModel = viewModel
        self.categoryId = category.id
        self.attribute = attribute
        let start = AttributeDraft(attribute: attribute, nextOrder: category.nextSortOrder)
        initial = start
        _draft = State(initialValue: start)
    }

    /// Messages appear once the user changes something, like the web form after first input.
    private var showErrors: Bool { draft != initial }

    var body: some View {
        Group {
            nameSection
            typeSection
            Section {
                Toggle("Majburiy maydon", isOn: $draft.required)
                LabeledContent("Tartib raqami") {
                    TextField("0", text: $draft.sortOrderText)
                        .keyboardType(.numberPad)
                        .multilineTextAlignment(.trailing)
                        .monospacedDigit()
                }
                fieldError(draft.orderError)
            }
        }
        .formSheet(
            title: attribute == nil ? "Xususiyat qo'shish" : "Xususiyatni tahrirlash",
            canSave: draft.isValid,
            isSaving: viewModel.isSaving,
            save: save
        )
    }

    private var nameSection: some View {
        Section {
            TextField("Masalan: Xotira hajmi yoki Rangi", text: Binding(get: { draft.label }, set: { draft.setLabel($0) }))
            fieldError(draft.labelError)
            LabeledContent("Kalit so'z (key)") {
                TextField("storage", text: Binding(get: { draft.key }, set: { draft.setKey($0) }))
                    .font(.body.monospaced())
                    .multilineTextAlignment(.trailing)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
            }
            fieldError(draft.keyError)
        } header: { Text("Maydon nomi") }
    }

    private var typeSection: some View {
        Section {
            Picker("Turi", selection: $draft.type) {
                ForEach(AttributeType.allCases) { Text($0.label).tag($0) }
            }
            if draft.type == .select {
                TextField("64GB, 128GB, 256GB", text: $draft.optionsText)
                fieldError(draft.optionsError)
            }
        } footer: {
            if draft.type == .select { Text("Variantlarni vergul bilan ajratib kiriting") }
        }
    }

    @ViewBuilder
    private func fieldError(_ message: String?) -> some View {
        if showErrors, let message { InlineMessage(text: message, font: .caption) }
    }

    /// Sends create or update; throws so the sheet shows the error.
    private func save() async throws {
        if let attribute {
            try await viewModel.updateAttribute(categoryId: categoryId, attributeId: attribute.id, draft.payload)
        } else {
            try await viewModel.createAttribute(categoryId: categoryId, draft.payload)
        }
    }
}
