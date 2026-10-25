import SwiftUI

/// Active / inactive capsule used by category and model rows.
struct ActiveBadge: View {
    let isActive: Bool

    var body: some View {
        StatusBadge(text: isActive ? "Faol" : "Nofaol", tint: isActive ? .green : .red)
    }
}

/// One attribute: label, key, type, options, required mark and order, like the web table row.
struct AttributeRow: View {
    let attribute: CategoryAttribute

    private var optionsText: String {
        let joined = (attribute.options ?? []).joined(separator: ", ")
        return joined.isEmpty ? "—" : joined
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack(alignment: .firstTextBaseline) {
                Text(attribute.label).font(.headline)
                if attribute.required { StatusBadge(text: "Majburiy", tint: .orange) }
                Spacer()
                Text("#\(attribute.sortOrder)")
                    .font(.caption)
                    .monospacedDigit()
                    .foregroundStyle(.secondary)
                    .accessibilityLabel("Tartib raqami \(attribute.sortOrder)")
            }
            Text(attribute.key).font(.caption.monospaced()).foregroundStyle(.secondary)
            Text("\(attribute.type.label) · \(optionsText)")
                .font(.caption)
                .foregroundStyle(.secondary)
                .lineLimit(2)
        }
        .padding(.vertical, 2)
        .accessibilityElement(children: .combine)
    }
}

/// One product model: name and active badge (tap to edit), with an inline active toggle.
struct ModelRow: View {
    let model: ProductModel
    let isBusy: Bool
    let onEdit: () -> Void
    let onToggle: (Bool) -> Void

    private var isActive: Bool { model.isActive ?? true }

    var body: some View {
        HStack {
            Button(action: onEdit) {
                HStack {
                    Text(model.name).foregroundStyle(.primary)
                    ActiveBadge(isActive: isActive)
                    Spacer()
                }
                .frame(minHeight: 44)
                .contentShape(Rectangle())
            }
            .buttonStyle(.borderless)
            .accessibilityHint("Tahrirlash")

            Toggle("Faol", isOn: Binding(get: { isActive }, set: onToggle))
                .labelsHidden()
                .disabled(isBusy)
                .accessibilityLabel("\(model.name) faol")
        }
    }
}
