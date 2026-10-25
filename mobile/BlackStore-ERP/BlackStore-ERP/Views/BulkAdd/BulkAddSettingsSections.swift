import SwiftUI

/// One-time settings applied to every device: model, condition, owner, place, attributes, prices.
struct BulkAddSettingsSections: View {
    @ObservedObject var vm: BulkAddViewModel

    var body: some View {
        deviceSection
        Section("Egalik va joylashuv") {
            BulkIdPicker(title: "Egasi (investor)", selection: $vm.settings.investorId, items: vm.investors, name: \.name)
            BulkIdPicker(title: "Filial / ombor", selection: $vm.settings.locationId, items: vm.locations, name: \.name)
        }
        if !vm.attributeDefs.isEmpty {
            Section("Xususiyatlar") {
                ForEach(vm.attributeDefs) { BulkAttributeRow(def: $0, value: attributeBinding($0.key)) }
            }
        }
        if vm.access.canManagePrices { pricesSection }
    }

    private var deviceSection: some View {
        Section {
            BulkIdPicker(title: "Kategoriya", selection: $vm.settings.categoryId, items: vm.categories, name: \.name)
                .onChange(of: vm.settings.categoryId) { Task { await vm.categoryChanged() } }
            BulkIdPicker(title: "Model", selection: $vm.settings.modelId, items: vm.models, name: \.name)
                .disabled(vm.settings.categoryId == nil || vm.isLoadingModels)
            Picker("Qurilma holati", selection: $vm.settings.condition) {
                ForEach(BulkCondition.allCases) { Text($0.label).tag($0) }
            }
        } header: {
            Text("Qurilma")
        } footer: {
            if vm.categories.isEmpty {
                Text("Seriyali kategoriya topilmadi. Avval katalogda kategoriya yarating.")
            } else if vm.settings.categoryId != nil && !vm.isLoadingModels && vm.models.isEmpty {
                Text("Bu kategoriyada faol model yo'q.")
            }
        }
    }

    private var pricesSection: some View {
        Section {
            if vm.access.canViewCost {
                BulkPriceRow(title: "Kirim narxi", text: $vm.settings.purchasePrice)
            }
            BulkPriceRow(title: "Sotish narxi", text: $vm.settings.salePrice)
            BulkPriceRow(title: "Minimal sotish narxi", text: $vm.settings.minSalePrice)
        } header: {
            Text("Narxlar")
        } footer: {
            Text("Narxlar ro'yxatdagi har bir qurilmaga qo'yiladi. Bo'sh qoldirish mumkin.")
        }
    }

    private func attributeBinding(_ key: String) -> Binding<String> {
        Binding(get: { vm.settings.attributes[key] ?? "" }, set: { vm.settings.attributes[key] = $0 })
    }
}

/// Menu picker over items with an id, with a "Tanlang" empty choice.
private struct BulkIdPicker<Item: Identifiable>: View where Item.ID == Int {
    let title: String
    @Binding var selection: Int?
    let items: [Item]
    let name: KeyPath<Item, String>

    var body: some View {
        Picker(title, selection: $selection) {
            Text("Tanlang").tag(Int?.none)
            ForEach(items) { Text($0[keyPath: name]).tag(Int?.some($0.id)) }
        }
    }
}

/// One category attribute: a list choice for SELECT, a text field otherwise.
private struct BulkAttributeRow: View {
    let def: CategoryAttribute
    @Binding var value: String

    var body: some View {
        if def.type == .select {
            Picker(def.label, selection: $value) {
                Text(def.required ? "Tanlang" : "Tanlanmagan").tag("")
                ForEach(def.options ?? [], id: \.self) { Text($0).tag($0) }
            }
        } else {
            LabeledContent(def.label) {
                if def.type == .number {
                    field.keyboardType(.decimalPad).decimalCommaFix($value)
                } else {
                    field
                }
            }
        }
    }

    private var field: some View {
        TextField(def.required ? "Majburiy" : "Ixtiyoriy", text: $value).multilineTextAlignment(.trailing)
    }
}

/// Money text field with the currency in the label.
private struct BulkPriceRow: View {
    let title: String
    @Binding var text: String

    var body: some View {
        LabeledContent("\(title) (\(APIConfig.currency))") {
            TextField("0.00", text: $text)
                .keyboardType(.decimalPad)
                .multilineTextAlignment(.trailing)
                .monospacedDigit()
                .decimalCommaFix($text)
        }
    }
}
