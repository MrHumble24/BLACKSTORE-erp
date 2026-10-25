import SwiftUI

/// Where the investor's money is now: sent abroad, fees, stock, deposits not yet sent (F25).
struct InvestorMoneyTrailSection: View {
    let money: InvestorMoney

    var body: some View {
        Section {
            MoneyRow("Yetkazib beruvchiga yuborilgan", money.sentToSuppliersDouble)
            MoneyRow("Ushlangan komissiyalar", Double(money.feesCharged) ?? 0)
            LabeledContent("Ombordagi tovarlar") {
                Text("\(money.unsoldItems) dona · \(APIConfig.formatMoney(money.unsoldAtCost))").monospacedDigit()
            }
            if money.defectiveItems > 0 {
                LabeledContent("Nosoz tovarlar", value: "\(money.defectiveItems) dona")
            }
            MoneyRow("Qoldiq depozit", money.unsentDepositsDouble)
        } header: {
            Text("Mablag'lar harakati")
        } footer: {
            Text("Investor pulining hozir qayerdaligi.")
        }
    }
}

/// Statement between the store and the investor: date, what happened, signed amount (F26).
struct InvestorStatementSection: View {
    let account: InvestorAccountResponse?
    let error: String?
    let retry: () async -> Void

    var body: some View {
        Section {
            if let account {
                if account.lines.isEmpty {
                    Text("Tranzaksiyalar mavjud emas").foregroundStyle(.secondary)
                } else {
                    ForEach(account.lines) { line in
                        PeopleStatementRow(
                            title: Self.kindLabel(line.kind), date: line.date, amount: line.amountDouble,
                            amountTint: line.amountDouble >= 0 ? .green : .primary
                        )
                    }
                }
            } else if let error {
                Label(error, systemImage: "exclamationmark.triangle.fill")
                    .foregroundStyle(.red)
                    .font(.footnote)
                Button("Qayta urinish") { Task { await retry() } }
            } else {
                ProgressView().frame(maxWidth: .infinity)
            }
        } header: {
            Text("Hisob-kitob varaqasi")
        } footer: {
            Text("Plyus: investor foydasiga, minus: investordan ayirildi.")
        }
    }

    /// Uzbek label for a statement line kind.
    static func kindLabel(_ kind: String) -> String {
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
}
