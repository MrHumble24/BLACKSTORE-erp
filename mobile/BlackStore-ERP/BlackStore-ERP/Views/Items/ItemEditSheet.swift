import SwiftUI

/// "Qurilmani tahrirlash": condition and the category's attributes, checked like the server (FR-3).
struct ItemEditSheet: View {
    @ObservedObject var viewModel: ItemDetailViewModel
    let item: ItemDetail
    /// nil when the category could not be loaded: only the condition is saved then.
    let defs: [CategoryAttribute]?
    @State private var condition: String
    @State private var drafts: [String: String]
    private let initialDrafts: [String: String]

    init(viewModel: ItemDetailViewModel, item: ItemDetail, defs: [CategoryAttribute]?) {
        self.viewModel = viewModel
        self.item = item
        self.defs = defs?.sorted { $0.sortOrder < $1.sortOrder }
        let values = item.attributeValues.mapValues(\.display)
        initialDrafts = values
        _condition = State(initialValue: item.condition)
        _drafts = State(initialValue: values)
    }

    private var hasErrors: Bool { (defs ?? []).contains { AttributeRules.error(drafts[$0.key] ?? "", for: $0) != nil } }
    private var attributesChanged: Bool {
        guard let defs else { return false }
        return AttributeRules.payload(drafts, defs: defs) != AttributeRules.payload(initialDrafts, defs: defs)
    }
    private var canSave: Bool {
        AttributeRules.canSave(conditionChanged: condition != item.condition,
                               attributesChanged: attributesChanged, hasErrors: hasErrors)
    }

    var body: some View {
        Group {
            Section("Qurilma holati") {
                Picker("Qurilma holati", selection: $condition) {
                    ForEach(ItemText.conditions, id: \.self) { Text(ItemText.condition($0)).tag($0) }
                }
                .pickerStyle(.inline)
                .labelsHidden()
            }
            attributesSection
        }
        .formSheet(title: "Qurilmani tahrirlash", canSave: canSave, isSaving: viewModel.isSaving, save: save)
    }

    @ViewBuilder
    private var attributesSection: some View {
        if let defs {
            if !defs.isEmpty {
                Section {
                    ForEach(defs) { AttributeField(def: $0, text: binding($0.key)) }
                } header: {
                    Text("Xususiyatlar")
                } footer: {
                    Text("* belgili maydonlar majburiy.")
                }
            }
        } else {
            Section("Xususiyatlar") {
                InlineMessage(text: "Kategoriya xususiyatlarini yuklab bo'lmadi. Faqat qurilma holati saqlanadi.", font: .caption)
            }
        }
    }

    private func binding(_ key: String) -> Binding<String> {
        Binding(get: { drafts[key] ?? "" }, set: { drafts[key] = $0 })
    }

    /// Sends the condition, plus the full cleaned attribute set only when it changed, so untouched
    /// values the category no longer defines are kept.
    private func save() async throws {
        let attributes = attributesChanged ? defs.map { AttributeRules.payload(drafts, defs: $0) } : nil
        try await viewModel.update(UpdateItemDetailPayload(condition: condition, attributes: attributes))
    }
}

/// One attribute input by type: list picker for SELECT, decimal pad for NUMBER, text for TEXT.
private struct AttributeField: View {
    let def: CategoryAttribute
    @Binding var text: String

    private var title: String { def.required ? "\(def.label) *" : def.label }

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            input
            if let error = AttributeRules.error(text, for: def) {
                InlineMessage(text: error, font: .caption)
            }
        }
    }

    @ViewBuilder
    private var input: some View {
        switch def.type {
        case .select:
            Picker(title, selection: $text) {
                if !def.required || text.isEmpty { Text("Tanlanmagan").tag("") }
                // Keep an old value that left the list visible, so the error makes sense.
                if !text.isEmpty && !(def.options ?? []).contains(text) { Text(text).tag(text) }
                ForEach(def.options ?? [], id: \.self) { Text($0).tag($0) }
            }
        case .number:
            LabeledContent(title) {
                TextField("Raqam", text: $text)
                    .keyboardType(.decimalPad)
                    .multilineTextAlignment(.trailing)
                    .monospacedDigit()
                    .decimalCommaFix($text)
            }
        case .text:
            LabeledContent(title) {
                TextField("Kiriting", text: $text)
                    .multilineTextAlignment(.trailing)
                    .autocorrectionDisabled()
            }
        }
    }
}
