import SwiftUI

/// Profit report for a period: net profit on top, split, breakdown and low-margin sales (FR-28, FR-11).
public struct ProfitReportsView: View {
    @StateObject private var viewModel = ProfitReportViewModel()
    @State private var breakdownTab: Int = 0

    public init() {}

    public var body: some View {
        content
            .navigationTitle("Foyda va hisobotlar")
            .navigationBarTitleDisplayMode(.inline) // inline: a pinned filter bar under a large title leaves a blank band
            .navigationBarTitleDisplayMode(.inline)
            .safeAreaInset(edge: .top, spacing: 0) { periodPicker }
            .task(id: viewModel.selectedPeriod) {
                await viewModel.fetchReport()
                // A newer period choice cancelled this load; drop its "cancelled" error.
                if Task.isCancelled { viewModel.errorMessage = nil }
            }
    }

    @ViewBuilder
    private var content: some View {
        if let report = viewModel.report {
            List {
                netProfitHeader(report.totals)
                if let err = viewModel.errorMessage {
                    Section { InlineMessage(text: err, font: .footnote) }
                }
                splitSection(report.totals)
                breakdownSection(report)
                if !report.lowMargin.isEmpty {
                    ProfitLowMarginSection(items: report.lowMargin)
                }
            }
            .listStyle(.insetGrouped)
            .refreshable { await viewModel.fetchReport() }
        } else if let err = viewModel.errorMessage {
            ErrorState(message: err) { await viewModel.fetchReport() }
        } else {
            LoadingState()
        }
    }

    private var periodPicker: some View {
        Picker("Davr", selection: $viewModel.selectedPeriod) {
            ForEach(ProfitPeriodPreset.allCases) { preset in
                Text(preset.rawValue).tag(preset)
            }
        }
        .pickerStyle(.segmented)
        .padding(.horizontal)
        .padding(.vertical, 8)
        .background(.bar)
    }

    private func netProfitHeader(_ totals: ProfitTotals) -> some View {
        PeopleAmountHeader(title: "Sof foyda", amount: totals.netProfitDouble, tint: peopleSignTint(totals.netProfitDouble)) {
            HStack {
                Text("Jami savdo: \(APIConfig.formatMoney(totals.sales))")
                if viewModel.isLoading { Spacer(); ProgressView() }
            }
            .font(.footnote)
            .foregroundStyle(.secondary)
            .monospacedDigit()
        }
    }

    private func splitSection(_ totals: ProfitTotals) -> some View {
        Section {
            MoneyRow("Yalpi foyda", totals.profitDouble)
            MoneyRow("Chiqimlar", totals.expensesDouble)
            MoneyRow("Boshqa kirimlar", Double(totals.otherIncome) ?? 0)
            MoneyRow("Do'kon ulushi", totals.businessShareDouble)
            MoneyRow("Investorlar ulushi", totals.investorShareDouble)
        } header: {
            Text("Foyda taqsimoti")
        } footer: {
            Text("Sof foyda = yalpi foyda − chiqimlar + foydaga qo'shiladigan kirimlar.")
        }
    }

    private func breakdownSection(_ report: ProfitReportResponse) -> some View {
        let groups = breakdownTab == 0 ? report.byLocation :
                     breakdownTab == 1 ? report.byCategory : report.byInvestor
        return Section("Tahlil") {
            Picker("Tahlil", selection: $breakdownTab) {
                Text("Filiallar").tag(0)
                Text("Kategoriyalar").tag(1)
                Text("Investorlar").tag(2)
            }
            .pickerStyle(.segmented)

            if groups.isEmpty {
                Text("Ma'lumot topilmadi").foregroundStyle(.secondary)
            } else {
                ForEach(groups) { group in
                    ProfitGroupRow(group: group)
                }
            }
        }
    }
}
