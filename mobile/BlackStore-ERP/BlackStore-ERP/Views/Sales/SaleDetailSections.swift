import SwiftUI

/// Big headline number: remaining debt in red, or the paid total in green.
struct SaleHeadlineSection: View {
    let sale: Sale
    let debt: Double?

    var body: some View {
        Section {
            VStack(spacing: 6) {
                Text(debt != nil ? "Qoldiq qarz" : "To'langan")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                Text(debt.map { APIConfig.formatMoney($0) } ?? APIConfig.formatMoney(sale.total))
                    .font(.largeTitle.bold())
                    .monospacedDigit()
                    .foregroundStyle(debt != nil ? .red : .green)
                    .minimumScaleFactor(0.6)
                    .lineLimit(1)
                StatusBadge.sale(sale.status)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 8)
            .accessibilityElement(children: .combine)
        }
    }
}

/// Customer, date and money totals of the sale.
struct SaleSummarySection: View {
    let sale: Sale

    var body: some View {
        Section("Savdo hisoboti") {
            if let customer = sale.customer {
                LabeledContent("Xaridor", value: customer.name)
                if let url = URL(string: "tel:\(customer.phone.filter { $0.isNumber || $0 == "+" })") {
                    LabeledContent("Telefon") { Link(customer.phone, destination: url) }
                } else {
                    LabeledContent("Telefon", value: customer.phone)
                }
            }
            if let date = DateDisplay.dateTime(sale.createdAt) {
                LabeledContent("Sana", value: date)
            }
            if let seller = sale.seller {
                LabeledContent("Sotuvchi", value: seller.name)
            }
            MoneyRow(title: "Jami summa", amount: APIConfig.formatMoney(sale.total))
            MoneyRow(title: "To'langan", amount: APIConfig.formatMoney(sale.paid))
        }
    }
}

/// Sold lines, each with a Return button while some quantity is still active.
struct SaleItemsSection: View {
    let items: [SaleLine]
    let onReturn: (SaleLine) -> Void

    var body: some View {
        Section {
            ForEach(items) { line in
                HStack(alignment: .center) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(line.productModel.name).font(.headline)
                        if let code = SalesFormat.identifier(of: line) {
                            Text(code).font(.caption).foregroundStyle(.secondary)
                        }
                        Text("\(line.quantity)x \(APIConfig.formatMoney(line.unitPrice))")
                            .font(.subheadline)
                            .monospacedDigit()
                    }
                    Spacer(minLength: 8)
                    returnControl(for: line)
                }
            }
        } header: {
            Text("Sotilgan mahsulotlar")
        } footer: {
            Text("Mijoz mahsulotni qaytarsa, \"Qaytarish\"ni bosing.")
        }
    }

    @ViewBuilder
    private func returnControl(for line: SaleLine) -> some View {
        if line.activeQuantity > 0 {
            Button { onReturn(line) } label: {
                Label("Qaytarish", systemImage: "arrow.uturn.backward")
            }
            .buttonStyle(.bordered)
            .frame(minHeight: 44)
        } else {
            Text("Qaytarilgan").font(.caption).foregroundStyle(.secondary)
        }
    }
}

/// Payments taken for the sale, newest as returned by the API.
struct SalePaymentsSection: View {
    let payments: [SalePayment]

    var body: some View {
        Section("To'lovlar tarixi") {
            if payments.isEmpty {
                Text("To'lovlar qayd etilmagan.").foregroundStyle(.secondary)
            }
            ForEach(payments) { p in
                MoneyRow(
                    title: p.method == "CASH" ? "Naqd to'lov" : "Karta orqali",
                    amount: APIConfig.formatMoney(p.amount),
                    tint: .green
                )
            }
        }
    }
}

/// Returns recorded on the sale with refund amount and reason.
struct SaleReturnsSection: View {
    let returns: [SaleReturnRecord]

    var body: some View {
        Section("Qaytarishlar") {
            ForEach(returns) { ret in
                VStack(alignment: .leading, spacing: 2) {
                    MoneyRow(
                        title: ret.result == "BACK_TO_STOCK" ? "Omborga qaytgan" : "Nuqsonli",
                        amount: "-\(APIConfig.formatMoney(ret.refundAmount))",
                        tint: .red
                    )
                    if let reason = ret.reason {
                        Text(reason).font(.caption).foregroundStyle(.secondary)
                    }
                }
            }
        }
    }
}
