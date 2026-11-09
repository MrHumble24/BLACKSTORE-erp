import SwiftUI

/// Read-only feed of every partner event (handover, sale, return, payment, refund) for a period,
/// with whole-range totals (F29). Pushed from the partners directory.
public struct PartnerTransactionsView: View {
    @StateObject private var viewModel = PartnerTransactionsViewModel()

    public init() {}

    public var body: some View {
        List {
            Section {
                Picker("Davr", selection: $viewModel.period) {
                    ForEach(PartnerTransactionsViewModel.Period.allCases) { Text($0.rawValue).tag($0) }
                }
                .pickerStyle(.segmented)
                .listRowBackground(Color.clear)
                .listRowInsets(EdgeInsets())
            }
            if let totals = viewModel.totals, !viewModel.transactions.isEmpty {
                totalsSection(totals)
            }
            content
        }
        .listStyle(.insetGrouped)
        .navigationTitle("Tranzaksiyalar")
        .navigationBarTitleDisplayMode(.inline)
        .task { await viewModel.fetch() }
        .refreshable { await viewModel.fetch() }
    }

    /// Loading, error and empty states shown in place of the rows so the screen is never blank.
    @ViewBuilder
    private var content: some View {
        if viewModel.isLoading && viewModel.transactions.isEmpty {
            Section { ProgressView().frame(maxWidth: .infinity, minHeight: 120) }
                .listRowBackground(Color.clear)
        } else if let err = viewModel.errorMessage, viewModel.transactions.isEmpty {
            Section { ErrorState(message: err) { await viewModel.fetch() } }
                .listRowBackground(Color.clear)
        } else if viewModel.transactions.isEmpty {
            Section { Text("Bu davrda tranzaksiyalar yo'q").foregroundStyle(.secondary) }
        } else {
            Section {
                ForEach(viewModel.transactions) { PartnerTransactionRow(tx: $0) }
            }
        }
    }

    private func totalsSection(_ t: PartnerTransactionTotals) -> some View {
        Section("Jami") {
            MoneyRow(title: "Topshirilgan", amount: APIConfig.formatMoney(t.handedOver))
            MoneyRow(title: "Sotilgan", amount: APIConfig.formatMoney(t.sold))
            MoneyRow(title: "Qaytarilgan", amount: APIConfig.formatMoney(t.returned))
            MoneyRow(title: "To'langan", amount: APIConfig.formatMoney(t.paid), tint: .green)
            MoneyRow(title: "Qaytarilgan pul", amount: APIConfig.formatMoney(t.refunded), tint: .orange)
        }
    }
}

/// One feed row: kind badge, partner and amount on top; item/count, time and the user/method below.
private struct PartnerTransactionRow: View {
    let tx: PartnerTransaction

    var body: some View {
        VStack(alignment: .leading, spacing: 5) {
            HStack(spacing: 8) {
                StatusBadge(text: Self.kindLabel(tx.kind), tint: Self.kindTint(tx.kind))
                Text(tx.partner.name).font(.subheadline.weight(.semibold))
                Spacer(minLength: 8)
                Text(APIConfig.formatMoney(tx.amount)).font(.subheadline).monospacedDigit()
            }
            HStack {
                Text(tx.kind == "HANDOVER" ? "× \(tx.count)" : (tx.item ?? "—"))
                    .font(.caption).foregroundStyle(.secondary)
                Spacer(minLength: 8)
                if let date = DateDisplay.dateTime(tx.date) {
                    Text(date).font(.caption2).foregroundStyle(.secondary)
                }
            }
            if let footer = footer {
                Text(footer).font(.caption2).foregroundStyle(.secondary)
            }
        }
        .padding(.vertical, 2)
    }

    /// Payment method, who acted, and the linked sale — whichever apply.
    private var footer: String? {
        var parts: [String] = []
        if let method = tx.method { parts.append(method == "CASH" ? "Naqd pul" : "Plastik karta") }
        if let user = tx.user?.name { parts.append(user) }
        if let saleId = tx.saleId { parts.append("Savdo #\(saleId)") }
        return parts.isEmpty ? nil : parts.joined(separator: " · ")
    }

    static func kindLabel(_ kind: String) -> String {
        switch kind {
        case "HANDOVER": return "Topshirildi"
        case "SOLD": return "Sotildi"
        case "RETURNED": return "Qaytarildi"
        case "PAYMENT": return "To'lov"
        case "REFUND": return "Pul qaytarildi"
        default: return kind
        }
    }

    static func kindTint(_ kind: String) -> Color {
        switch kind {
        case "HANDOVER": return .blue
        case "PAYMENT": return .green
        case "REFUND": return .orange
        case "RETURNED": return .secondary
        default: return .primary
        }
    }
}
