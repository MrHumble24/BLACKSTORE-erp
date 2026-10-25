import SwiftUI

/// Investor account: what the store owes on top, money trail, and the statement (FR-8, FR-10, F25, F26).
public struct InvestorDetailView: View {
    public let investorId: Int
    @StateObject private var viewModel = InvestorsViewModel()
    @State private var isShowingTransactionSheet: Bool = false

    public init(investorId: Int) {
        self.investorId = investorId
    }

    public var body: some View {
        content
            .navigationTitle(viewModel.selectedDetail?.name ?? "Investor")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button {
                        isShowingTransactionSheet = true
                    } label: {
                        Label("Tranzaksiya", systemImage: "plus.circle.fill")
                    }
                    .disabled(viewModel.selectedDetail == nil)
                }
            }
            .task { await load() }
            .sheet(isPresented: $isShowingTransactionSheet) {
                if let d = viewModel.selectedDetail {
                    InvestorTransactionSheet(investorId: d.id, investorName: d.name, viewModel: viewModel)
                }
            }
    }

    private func load() async {
        await viewModel.fetchDetail(id: investorId)
        await viewModel.fetchAccount(id: investorId)
    }

    @ViewBuilder
    private var content: some View {
        if let d = viewModel.selectedDetail {
            List {
                owedHeader(for: d)
                // Without an account the statement section shows the error with Retry itself.
                if let err = viewModel.errorMessage, viewModel.accountResponse != nil {
                    Section { InlineMessage(text: err, font: .footnote) }
                }
                if let money = d.money {
                    InvestorMoneyTrailSection(money: money)
                }
                InvestorStatementSection(
                    account: viewModel.accountResponse,
                    error: viewModel.errorMessage,
                    retry: { await viewModel.fetchAccount(id: investorId) }
                )
            }
            .listStyle(.insetGrouped)
            .refreshable { await load() }
        } else if let err = viewModel.errorMessage {
            ErrorState(message: err) { await load() }
        } else {
            LoadingState()
        }
    }

    /// Big number: what the store owes the investor (orange), or what they owe the store (green).
    /// Redacted until the account statement arrives.
    private func owedHeader(for d: InvestorDetail) -> some View {
        let owed = viewModel.accountResponse?.owedDouble ?? 0
        let tint: Color = owed > 0.005 ? .orange : (owed < -0.005 ? .green : .secondary)
        return PeopleAmountHeader(title: "Do'kon qarzi investorga", amount: owed, tint: tint) {
            HStack {
                Label(formatShare(type: d.shareType, value: d.shareValue), systemImage: "percent")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                Spacer()
                if d.telegramLinked == true {
                    Label("Telegram ulangan", systemImage: "paperplane.fill")
                        .font(.footnote)
                        .foregroundStyle(.tint)
                }
            }
        }
        .redacted(reason: viewModel.accountResponse == nil ? .placeholder : [])
    }

    private func formatShare(type: String, value: String) -> String {
        if type == "PERCENT" { return "\(value)% foyda ulushi" }
        if type == "FIXED_PER_ITEM" { return "\(APIConfig.formatMoney(value)) dona boshiga" }
        return "Ulushsiz"
    }
}
