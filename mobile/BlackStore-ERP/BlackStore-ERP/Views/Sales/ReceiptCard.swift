import SwiftUI

/// What a receipt shows, built once from the sale and the shop's receipt settings.
struct ReceiptContent {
    let sale: Sale
    let settings: ReceiptSettings?

    var shopName: String { settings?.shopName ?? "BLACKSTORE" }
    var headerNote: String? { visible(settings?.headerNote, settings?.showHeaderNote) }
    var address: String? { visible(settings?.address, settings?.showAddress) }
    var phone: String? { visible(settings?.phone, settings?.showPhone) }
    var footer: String { (settings?.showFooter != false ? settings?.footer : nil) ?? "Xaridingiz uchun rahmat!" }
    var debt: Double? { SalesFormat.debt(of: sale) }

    private func visible(_ value: String?, _ flag: Bool?) -> String? {
        guard let value, !value.isEmpty, flag != false else { return nil }
        return value
    }

    /// Plain-text receipt for sharing via Telegram, AirDrop or messages.
    var shareText: String {
        var lines = ["🛍️ \(shopName) CHEK #\(sale.id)"]
        if let phone { lines.append("Tel: \(phone)") }
        if let address { lines.append("Manzil: \(address)") }
        if let customer = sale.customer { lines.append("Xaridor: \(customer.name)") }
        lines.append("-------------------------")
        for line in sale.items ?? [] {
            let code = SalesFormat.identifier(of: line).map { " (\($0))" } ?? ""
            lines.append("• \(line.productModel.name)\(code) — \(line.quantity) x \(APIConfig.formatMoney(line.unitPrice))")
        }
        lines.append("-------------------------")
        lines.append("Jami: \(APIConfig.formatMoney(sale.total))")
        if let paid = sale.paid { lines.append("To'landi: \(APIConfig.formatMoney(paid))") }
        if let debt { lines.append("Qoldiq (Qarz): \(APIConfig.formatMoney(debt))") }
        lines.append("\n\(footer)")
        return lines.joined(separator: "\n")
    }
}

/// Paper-style receipt card: shop header, customer, lines, totals and footer.
struct ReceiptCard: View {
    let content: ReceiptContent
    /// Only the shop header depends on the settings request, so only it is redacted while loading.
    let isLoadingHeader: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            header.redacted(reason: isLoadingHeader ? .placeholder : [])
            Divider()
            if let customer = content.sale.customer {
                LabeledContent("Xaridor", value: customer.name).font(.subheadline)
                Divider()
            }
            ForEach(content.sale.items ?? []) { line in itemRow(line) }
            Divider()
            totals
            Divider()
            Text(content.footer)
                .font(.caption)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .frame(maxWidth: .infinity)
        }
        .padding()
        .background(Color(.secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 16))
    }

    private var header: some View {
        VStack(spacing: 4) {
            Text(content.shopName).font(.title3.bold())
            ForEach([content.headerNote, content.address, content.phone].compactMap { $0 }, id: \.self) { text in
                Text(text).font(.caption).foregroundStyle(.secondary)
            }
        }
        .multilineTextAlignment(.center)
        .frame(maxWidth: .infinity)
    }

    private func itemRow(_ line: SaleLine) -> some View {
        HStack(alignment: .firstTextBaseline) {
            VStack(alignment: .leading, spacing: 2) {
                Text(line.productModel.name).font(.subheadline.weight(.medium))
                if let code = SalesFormat.identifier(of: line) {
                    Text(code).font(.caption).foregroundStyle(.secondary)
                }
            }
            Spacer()
            Text("\(line.quantity)x \(APIConfig.formatMoney(line.unitPrice))")
                .font(.subheadline)
                .monospacedDigit()
        }
        .accessibilityElement(children: .combine)
    }

    private var totals: some View {
        VStack(spacing: 6) {
            MoneyRow(title: "Jami", amount: APIConfig.formatMoney(content.sale.total), isBold: true)
            if let paid = content.sale.paid {
                MoneyRow(title: "To'landi", amount: APIConfig.formatMoney(paid), tint: .green)
            }
            if let debt = content.debt {
                MoneyRow(title: "Qoldiq (Qarz)", amount: APIConfig.formatMoney(debt), tint: .red, isBold: true)
            }
        }
        .font(.subheadline)
    }
}
