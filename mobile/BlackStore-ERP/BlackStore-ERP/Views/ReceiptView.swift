import SwiftUI

/// Receipt modal presenting the finished sale breakdown with branding settings and native sharing.
public struct ReceiptView: View {
    @Environment(\.dismiss) private var dismiss
    public let sale: Sale
    public let onDismiss: () -> Void
    @State private var settings: ReceiptSettings? = nil

    public init(sale: Sale, onDismiss: @escaping () -> Void) {
        self.sale = sale
        self.onDismiss = onDismiss
    }

    public var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    successBadge

                    receiptCard

                    ShareLink(item: formattedReceiptText) {
                        Label("Chekni yuborish (Telegram / AirDrop)", systemImage: "square.and.arrow.up")
                            .font(.headline)
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color(.secondarySystemBackground))
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                    }

                    Button {
                        onDismiss()
                        dismiss()
                    } label: {
                        Text("Yangi savdo")
                            .font(.headline)
                            .frame(maxWidth: .infinity)
                            .padding()
                    }
                    .buttonStyle(.borderedProminent)
                    .controlSize(.large)
                }
                .padding()
            }
            .navigationTitle("Chek")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Yopish") {
                        onDismiss()
                        dismiss()
                    }
                }
            }
            .task {
                do {
                    settings = try await APIClient.shared.get("/settings/receipt")
                } catch {
                    // Fall back to default branding
                }
            }
        }
    }

    private var successBadge: some View {
        VStack(spacing: 8) {
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 64))
                .foregroundStyle(.green)

            Text("Savdo muvaffaqiyatli amalga oshirildi!")
                .font(.headline)
                .multilineTextAlignment(.center)

            Text("Savdo raqami: #\(sale.id)")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
    }

    private var receiptCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            headerBranding

            Divider()

            if let customer = sale.customer {
                HStack {
                    Text("Xaridor:")
                        .foregroundStyle(.secondary)
                    Spacer()
                    Text(customer.name)
                        .fontWeight(.medium)
                }
                .font(.subheadline)
            }

            Divider()

            itemsSection

            Divider()

            totalsSection

            footerBranding
        }
        .padding()
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }

    private var headerBranding: some View {
        VStack(spacing: 4) {
            Text(settings?.shopName ?? "BLACKSTORE")
                .font(.title3)
                .fontWeight(.bold)

            if let note = settings?.headerNote, !(note.isEmpty), settings?.showHeaderNote != false {
                Text(note)
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }

            if let addr = settings?.address, !(addr.isEmpty), settings?.showAddress != false {
                Text(addr)
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }

            if let phone = settings?.phone, !(phone.isEmpty), settings?.showPhone != false {
                Text(phone)
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
        }
        .frame(maxWidth: .infinity, alignment: .center)
    }

    private var itemsSection: some View {
        VStack(spacing: 8) {
            if let items = sale.items {
                ForEach(items) { line in
                    HStack(alignment: .top) {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(line.productModel.name)
                                .font(.subheadline)
                                .fontWeight(.medium)

                            if let item = line.item, let firstId = item.identifiers.first {
                                Text("\(firstId.type): \(firstId.value)")
                                    .font(.caption2)
                                    .foregroundStyle(.secondary)
                            }
                        }

                        Spacer()

                        Text("\(line.quantity)x \(APIConfig.formatMoney(line.unitPrice))")
                            .font(.subheadline)
                    }
                }
            }
        }
    }

    private var totalsSection: some View {
        VStack(spacing: 6) {
            HStack {
                Text("Jami:")
                Spacer()
                Text(APIConfig.formatMoney(sale.total))
                    .fontWeight(.bold)
            }

            if let paid = sale.paid {
                HStack {
                    Text("To'landi:")
                        .foregroundStyle(.secondary)
                    Spacer()
                    Text(APIConfig.formatMoney(paid))
                        .foregroundStyle(.green)
                }
            }

            if let bal = sale.balance, let b = Double(bal), b > 0 {
                HStack {
                    Text("Qoldiq (Qarz):")
                        .foregroundStyle(.red)
                    Spacer()
                    Text(APIConfig.formatMoney(bal))
                        .foregroundStyle(.red)
                        .fontWeight(.bold)
                }
            }
        }
        .font(.subheadline)
    }

    private var footerBranding: some View {
        VStack(spacing: 4) {
            Divider()
            let footerText = (settings?.showFooter != false ? settings?.footer : nil) ?? "Xaridingiz uchun rahmat!"
            Text(footerText)
                .font(.caption)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .frame(maxWidth: .infinity, alignment: .center)
        }
    }

    private var formattedReceiptText: String {
        let shop = settings?.shopName ?? "BLACKSTORE"
        var text = "🛍️ \(shop) CHEK #\(sale.id)\n"
        if let phone = settings?.phone, !phone.isEmpty, settings?.showPhone != false {
            text += "Tel: \(phone)\n"
        }
        if let addr = settings?.address, !addr.isEmpty, settings?.showAddress != false {
            text += "Manzil: \(addr)\n"
        }
        if let customer = sale.customer {
            text += "Xaridor: \(customer.name)\n"
        }
        text += "-------------------------\n"
        if let items = sale.items {
            for line in items {
                text += "• \(line.productModel.name)"
                if let item = line.item, let firstId = item.identifiers.first {
                    text += " (\(firstId.type): \(firstId.value))"
                }
                text += " — \(line.quantity) x \(APIConfig.formatMoney(line.unitPrice))\n"
            }
        }
        text += "-------------------------\n"
        text += "Jami: \(APIConfig.formatMoney(sale.total))\n"
        if let paid = sale.paid {
            text += "To'landi: \(APIConfig.formatMoney(paid))\n"
        }
        if let bal = sale.balance, let b = Double(bal), b > 0 {
            text += "Qoldiq (Qarz): \(APIConfig.formatMoney(bal))\n"
        }
        let footerText = (settings?.showFooter != false ? settings?.footer : nil) ?? "Xaridingiz uchun rahmat!"
        text += "\n\(footerText)"
        return text
    }
}
