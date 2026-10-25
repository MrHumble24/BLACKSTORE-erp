import SwiftUI

/// Spec sections for a looked-up device: main info, identifiers, attributes and label printing.
struct DeviceDetailSections: View {
    let item: Item
    let onPrintLabel: () -> Void

    var body: some View {
        Section("Asosiy ma'lumotlar") {
            LabeledContent("Model", value: item.productModel.name)
            if let cat = item.productModel.category {
                LabeledContent("Kategoriya", value: cat.name)
            }
            LabeledContent("Holati", value: item.condition)
            LabeledContent("Status") {
                Text(item.status).foregroundStyle(item.status == "IN_STOCK" ? .green : .secondary)
            }
            if let loc = item.location {
                LabeledContent("Joylashuv", value: loc.name)
            }
            MoneyRow(title: "Narxi", amount: APIConfig.formatMoney(item.salePrice), isBold: true)
        }
        Section("Identifikatorlar") {
            ForEach(item.identifiers) { id in
                LabeledContent(id.type) { Text(id.value).textSelection(.enabled) }
            }
        }
        if let attrs = item.attributes, !attrs.isEmpty {
            Section("Texnik parametrlar") {
                ForEach(attrs.sorted(by: { $0.key < $1.key }), id: \.key) { key, val in
                    LabeledContent(key.capitalized, value: val)
                }
            }
        }
        Section {
            Button(action: onPrintLabel) {
                Label("Yorliq (Shtrix-kod) chop etish", systemImage: "printer")
            }
            .frame(minHeight: 44)
        }
    }
}
