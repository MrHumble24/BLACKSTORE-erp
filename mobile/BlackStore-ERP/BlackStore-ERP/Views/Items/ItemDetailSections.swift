import SwiftUI

/// Top of the device page: model name, spec summary in web badge order, and the internal number.
struct ItemHeaderSection: View {
    let item: ItemDetail

    var body: some View {
        Section {
            VStack(alignment: .leading, spacing: 4) {
                Text(item.productModel.name).font(.title2.bold())
                let specs = AttributeRules.specSummary(item.attributeValues)
                if !specs.isEmpty {
                    Text(specs).font(.subheadline).foregroundStyle(.secondary)
                }
                Text("№ \(item.id)").font(.caption).foregroundStyle(.secondary).monospacedDigit()
            }
            .padding(.vertical, 4)
            .accessibilityElement(children: .combine)
        }
    }
}

/// "Qurilma ma'lumotlari": category, status, condition and the category's attributes.
struct ItemInfoSection: View {
    let item: ItemDetail
    let defs: [CategoryAttribute]?
    let canEdit: Bool
    let onEdit: () -> Void

    var body: some View {
        Section("Qurilma ma'lumotlari") {
            LabeledContent("Kategoriya", value: item.productModel.category?.name ?? "—")
            LabeledContent("Holati") {
                StatusBadge(text: ItemText.status(item.status), tint: Self.tint(item.status))
            }
            LabeledContent("Qurilma holati", value: ItemText.condition(item.condition))
            ForEach(AttributeRules.rows(item.attributeValues, defs: defs ?? []), id: \.key) { row in
                LabeledContent(row.label, value: row.value)
            }
            if canEdit {
                Button("Tahrirlash", systemImage: "pencil", action: onEdit)
            }
        }
    }

    /// Status colour: available green, away blue/orange, finished grey, faulty red.
    static func tint(_ status: String) -> Color {
        switch status {
        case "IN_STOCK": return .green
        case "AT_PARTNER": return .blue
        case "DEBT": return .orange
        case "RETURNED": return .purple
        case "DEFECTIVE": return .red
        default: return .secondary
        }
    }
}

/// "Identifikatorlar": IMEI / serial / system code, with add, generate code and label print.
struct ItemIdentifiersSection: View {
    let item: ItemDetail
    let permissions: ItemPermissions
    let isSaving: Bool
    let onAdd: () -> Void
    let onPrint: () -> Void
    let onGenerate: () -> Void
    /// What the confirmation runs: create the code only, or create it and then print.
    private enum Confirm { case code, codeAndPrint }
    @State private var confirming: Confirm?

    private var labelAction: LabelAction {
        LabelAction(hasSystemCode: item.hasSystemCode, canGenerate: permissions.canEdit)
    }

    var body: some View {
        Section("Identifikatorlar") {
            if item.identifiers.isEmpty {
                Text("Identifikatorlar yo'q").foregroundStyle(.secondary)
            }
            ForEach(item.identifiers) { identifier in
                LabeledContent(ItemText.identifierType(identifier.type)) {
                    Text(identifier.value).font(.body.monospaced())
                }
                .contextMenu {
                    Button("Nusxalash", systemImage: "doc.on.doc") { copy(identifier.value) }
                }
            }
            actions
        }
        .confirmationDialog("Tizim kodi yaratilsinmi?", isPresented: Binding(isPresent: $confirming),
                            titleVisibility: .visible, presenting: confirming) { action in
            Button(action == .codeAndPrint ? "Yaratish va chop etish" : "Yaratish") {
                action == .codeAndPrint ? onPrint() : onGenerate()
            }
        } message: { _ in
            Text("Qurilmaga BS-\(String(format: "%06d", item.id)) doimiy kodi biriktiriladi. Uni keyin o'chirib bo'lmaydi.")
        }
    }

    @ViewBuilder
    private var actions: some View {
        if permissions.canEdit && !IdentifierRules.addableTypes(existing: item.identifiers.map(\.type)).isEmpty {
            Button("Identifikator qo'shish", systemImage: "plus", action: onAdd)
        }
        if permissions.canEdit && !item.hasSystemCode {
            busyButton("Tizim kodini yaratish", systemImage: "barcode") { confirming = .code }
        }
        switch labelAction {
        case .print: busyButton("Yorliq chop etish", systemImage: "printer", action: onPrint)
        case .generateThenPrint: busyButton("Yorliq chop etish", systemImage: "printer") { confirming = .codeAndPrint }
        case .noSystemCode:
            LabeledContent("Yorliq") { Text("Tizim kodi yo'q").foregroundStyle(.secondary) }
        }
    }

    private func busyButton(_ title: String, systemImage: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack {
                Label(title, systemImage: systemImage)
                if isSaving { Spacer(); ProgressView() }
            }
        }
        .disabled(isSaving)
    }

    /// Copies a code for this device only, cleared after two minutes.
    private func copy(_ value: String) {
        UIPasteboard.general.setItems([[UIPasteboard.typeAutomatic: value]],
                                      options: [.localOnly: true, .expirationDate: Date().addingTimeInterval(120)])
    }
}

/// "Egalik va joylashuv": owner investor, location and record dates. Never shows cost.
struct ItemOwnershipSection: View {
    let item: ItemDetail

    var body: some View {
        Section("Egalik va joylashuv") {
            LabeledContent("Egasi (investor)", value: "\(item.investor.name) (\(item.investor.code))")
            LabeledContent("Filial / ombor", value: "\(item.location.name) (\(ItemText.placeType(item.location.type)))")
            LabeledContent("Qo'shilgan", value: DateDisplay.dateTime(item.createdAt) ?? "—")
            LabeledContent("Oxirgi o'zgarish", value: DateDisplay.dateTime(item.updatedAt) ?? "—")
        }
    }
}

/// "Narxlar": sale and minimum price; purchase price and total cost only with view_cost.
struct ItemPricingSection: View {
    let item: ItemDetail
    let permissions: ItemPermissions
    let onEdit: () -> Void

    var body: some View {
        Section("Narxlar") {
            price("Sotish narxi", item.salePrice, bold: true)
            price("Minimal sotish narxi", item.minSalePrice)
            if permissions.canViewCost {
                price("Kirim narxi", item.purchasePrice)
                price("Jami tannarx", item.cost)
            }
            if permissions.canEditPrices {
                Button("Narxlarni tahrirlash", systemImage: "tag", action: onEdit)
            }
        }
    }

    @ViewBuilder
    private func price(_ title: String, _ amount: String?, bold: Bool = false) -> some View {
        if let amount {
            MoneyRow(title: title, amount: APIConfig.formatMoney(amount), isBold: bold)
        } else {
            LabeledContent(title) { Text("Belgilanmagan").foregroundStyle(.secondary) }
        }
    }
}

/// "Ko'chirishlar": transfers that moved this device; hidden when there are none, like the web.
struct ItemTransfersSection: View {
    let transfers: [ItemTransfer]
    let error: String?

    var body: some View {
        if let error {
            Section("Ko'chirishlar") { InlineMessage(text: error, font: .caption) }
        } else if !transfers.isEmpty {
            Section("Ko'chirishlar") {
                ForEach(transfers) { row($0) }
            }
        }
    }

    private func row(_ transfer: ItemTransfer) -> some View {
        let date = DateDisplay.dateTime(transfer.date) ?? transfer.date
        return VStack(alignment: .leading, spacing: 2) {
            Text("\(transfer.fromLocation.name) → \(transfer.toLocation.name)")
            Text("\(date) · \(transfer.user.name)").font(.caption).foregroundStyle(.secondary)
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("\(transfer.fromLocation.name)dan \(transfer.toLocation.name)ga, \(date), \(transfer.user.name)")
    }
}
