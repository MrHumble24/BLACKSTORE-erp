import SwiftUI

/// Add or edit sheet for a category attribute; the key follows the label until the user edits it.
struct AttributeFormSheet: View {
    @ObservedObject var viewModel: CategoriesViewModel
    let categoryId: Int
    /// nil = add a new attribute.
    let attribute: CategoryAttribute?
    @Environment(\.dismiss) private var dismiss
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
        NavigationStack {
            Form {
                if let err = viewModel.errorMessage {
                    Section { InlineMessage(text: err) }
                }
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
            .navigationTitle(attribute == nil ? "Xususiyat qo'shish" : "Xususiyatni tahrirlash")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { toolbarButtons }
            .keyboardDoneBar()
        }
        .presentationDetents([.large])
        .presentationDragIndicator(.visible)
        .onAppear { viewModel.errorMessage = nil }
        .onDisappear { viewModel.errorMessage = nil }
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

    @ToolbarContentBuilder
    private var toolbarButtons: some ToolbarContent {
        ToolbarItem(placement: .cancellationAction) { Button("Bekor qilish") { dismiss() } }
        ToolbarItem(placement: .confirmationAction) {
            Button("Saqlash") { Task { await save() } }
                .disabled(!draft.isValid || viewModel.isSaving)
        }
    }

    @ViewBuilder
    private func fieldError(_ message: String?) -> some View {
        if showErrors, let message { InlineMessage(text: message, font: .caption) }
    }

    /// Sends create or update and closes on success.
    private func save() async {
        let ok = if let attribute {
            await viewModel.updateAttribute(categoryId: categoryId, attributeId: attribute.id, draft.payload)
        } else {
            await viewModel.createAttribute(categoryId: categoryId, draft.payload)
        }
        if ok { dismiss() }
    }
}
