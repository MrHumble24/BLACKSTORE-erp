import SwiftUI

/// One attribute: label, key, type, options, required and order, like the web table row.
struct AttributeRow: View {
    let attribute: CategoryAttribute

    private var optionsText: String {
        let joined = (attribute.options ?? []).joined(separator: ", ")
        return joined.isEmpty ? "—" : joined
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(attribute.label).font(.headline)
            Text(attribute.key).font(.caption.monospaced()).foregroundStyle(.secondary)
            Text("\(attribute.type.label) · \(optionsText)")
                .lineLimit(2)
            HStack {
                Text("Majburiy maydon: \(attribute.required ? "Ha" : "—")")
                Spacer()
                Text("Tartib raqami: \(attribute.sortOrder)").monospacedDigit()
            }
        }
        .font(.caption)
        .foregroundStyle(.secondary)
        .padding(.vertical, 2)
        .accessibilityElement(children: .combine)
    }
}

/// One product model: name and active badge (tap to edit), with an optimistic active toggle.
struct ModelRow: View {
    let model: ProductModel
    let onEdit: () -> Void
    /// Saves the new state; returns false when the server refused it.
    let onToggle: (Bool) async -> Bool
    @State private var isOn: Bool

    init(model: ProductModel, onEdit: @escaping () -> Void, onToggle: @escaping (Bool) async -> Bool) {
        self.model = model
        self.onEdit = onEdit
        self.onToggle = onToggle
        _isOn = State(initialValue: model.isActive ?? true)
    }

    var body: some View {
        HStack {
            Button(action: onEdit) {
                HStack {
                    Text(model.name).foregroundStyle(.primary)
                    ActiveBadge(isActive: model.isActive ?? true)
                    Spacer()
                }
                .frame(minHeight: 44)
                .contentShape(Rectangle())
            }
            .buttonStyle(.borderless)
            .accessibilityHint("Tahrirlash")

            Toggle("Faol", isOn: Binding(get: { isOn }, set: toggle))
                .labelsHidden()
                .accessibilityLabel("\(model.name) faol")
        }
        .onChange(of: model.isActive) { _, value in isOn = value ?? true }
    }

    /// Flips at once, flips back if the save fails.
    private func toggle(_ value: Bool) {
        isOn = value
        Task { if !(await onToggle(value)) { isOn = !value } }
    }
}
