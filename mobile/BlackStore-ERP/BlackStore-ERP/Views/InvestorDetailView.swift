import SwiftUI

/// Detailed investor profile with money trail figures and live statement ledger (FR-8, FR-10, F25, F26).
public struct InvestorDetailView: View {
    public let investorId: Int
    @StateObject private var viewModel = InvestorsViewModel()
    @State private var isShowingTransactionSheet: Bool = false

    public init(investorId: Int) {
        self.investorId = investorId
    }

    public var body: some View {
        List {
            if let err = viewModel.errorMessage {
                Section { Text(err).font(.caption).foregroundStyle(.red) }
            }

            if let d = viewModel.selectedDetail {
                balanceHeaderSection(for: d)

                if let money = d.money {
                    moneyTrailSection(for: money)
                }

                statementLedgerSection
            } else if viewModel.isLoading {
                Section { ProgressView().padding(.vertical, 20) }
            }
        }
        .listStyle(.insetGrouped)
        .navigationTitle(viewModel.selectedDetail?.name ?? "Investor")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button {
                    isShowingTransactionSheet = true
                } label: {
                    Label("Tranzaksiya", systemImage: "plus.circle.fill")
                }
            }
        }
        .task {
            await viewModel.fetchDetail(id: investorId)
            await viewModel.fetchAccount(id: investorId)
        }
        .refreshable {
            await viewModel.fetchDetail(id: investorId)
            await viewModel.fetchAccount(id: investorId)
        }
        .sheet(isPresented: $isShowingTransactionSheet) {
            if let d = viewModel.selectedDetail {
                InvestorTransactionSheet(investorId: d.id, investorName: d.name, viewModel: viewModel)
            }
        }
    }

    private func balanceHeaderSection(for d: InvestorDetail) -> some View {
        Section {
            VStack(alignment: .leading, spacing: 8) {
                Text("Hisoblangan balans")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Text(String(format: "$%.2f", d.balanceDouble))
                    .font(.system(size: 32, weight: .bold, design: .rounded))
                    .foregroundStyle(d.balanceDouble >= 0 ? Color.primary : Color.red)

                HStack {
                    Label(formatShare(type: d.shareType, value: d.shareValue), systemImage: "percent")
                        .font(.caption)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color.purple.opacity(0.12))
                        .clipShape(Capsule())
                    Spacer()
                    if d.telegramLinked == true {
                        Label("Telegram ulangan", systemImage: "paperplane.fill")
                            .font(.caption2)
                            .foregroundStyle(.blue)
                    }
                }
            }
            .padding(.vertical, 4)
        }
    }

    private func moneyTrailSection(for m: InvestorMoney) -> some View {
        Section("Mablag'lar harakati (Money Trail)") {
            LabeledContent("Xorijga yuborilgan to'lovlar", value: "$\(m.sentToSuppliers)")
            LabeledContent("Ushlangan komissiyalar", value: "$\(m.feesCharged)")
            LabeledContent("Ombordagi tovarlar", value: "\(m.unsoldItems) dona ($\(m.unsoldAtCost))")
            if m.defectiveItems > 0 {
                LabeledContent("Nosoz tovarlar soni", value: "\(m.defectiveItems) dona")
            }
            LabeledContent("Qoldiq depozit", value: "$\(m.unsentDeposits)")
        }
    }

    private var statementLedgerSection: some View {
        Section("Hisob-kitob varaqasi (Statement)") {
            if let resp = viewModel.accountResponse {
                HStack {
                    Text("Do'kon qarzi:")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Spacer()
                    Text(String(format: "$%.2f", resp.owedDouble))
                        .font(.caption)
                        .fontWeight(.bold)
                }

                if resp.lines.isEmpty {
                    Text("Tranzaksiyalar mavjud emas")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                } else {
                    ForEach(resp.lines) { line in
                        accountLineRow(for: line)
                    }
                }
            } else {
                ProgressView()
            }
        }
    }

    private func accountLineRow(for line: InvestorAccountLine) -> some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text(lineKindLabel(line.kind))
                    .font(.caption)
                    .fontWeight(.medium)
                Text(line.date.prefix(10))
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
            Spacer()
            Text(line.amountDouble >= 0 ? "+$\(line.amount)" : "-$\(abs(line.amountDouble))")
                .font(.subheadline)
                .fontWeight(.semibold)
                .foregroundStyle(line.amountDouble >= 0 ? .green : .primary)
        }
    }

    private func lineKindLabel(_ kind: String) -> String {
        switch kind {
        case "GOODS": return "Tovar qabuli"
        case "SENT": return "Yetkazib beruvchiga to'lov"
        case "FEE": return "Komissiya xarajati"
        case "SHARE": return "Foyda ulushi"
        case "RETURN": return "Tovar qaytarilishi"
        case "CASH_IN": return "Depozit (Kirim)"
        case "CASH_OUT": return "To'lov (Chiqim)"
        default: return kind
        }
    }

    private func formatShare(type: String, value: String) -> String {
        if type == "PERCENT" { return "\(value)% foyda ulushi" }
        if type == "FIXED_PER_ITEM" { return "$\(value) dona boshiga" }
        return "Ulushsiz"
    }
}
