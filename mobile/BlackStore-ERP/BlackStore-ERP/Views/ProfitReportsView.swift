import SwiftUI

/// Profit report for a period (FR-28, FR-11): KPI band and the same charts as the web report, then
/// low-margin sales, the profit split and the breakdown tables. Cost shows only with `view_cost`.
public struct ProfitReportsView: View {
    let canViewCost: Bool
    @StateObject private var viewModel = ProfitReportViewModel()
    @State private var breakdownTab: Int = 0

    public init(canViewCost: Bool) {
        self.canViewCost = canViewCost
    }

    public var body: some View {
        content
            .navigationTitle("Foyda va hisobotlar")
            .navigationBarTitleDisplayMode(.inline) // inline: a pinned filter bar under a large title leaves a blank band
            .safeAreaInset(edge: .top, spacing: 0) { periodPicker }
            .task(id: viewModel.selectedPeriod) {
                await viewModel.fetchReport()
                // A newer period choice cancelled this load; drop its "cancelled" error.
                if Task.isCancelled { viewModel.errorMessage = nil }
            }
    }

    @ViewBuilder
    private var content: some View {
        if let report = viewModel.report, let data = viewModel.chartData {
            reportList(report, data)
                .refreshable { await viewModel.fetchReport() }
        } else if let err = viewModel.errorMessage {
            ErrorState(message: err) { await viewModel.fetchReport() }
        } else {
            // First load: the real layout with placeholder figures, redacted.
            reportList(.placeholder, ProfitChartData(report: .placeholder))
                .redacted(reason: .placeholder)
                .allowsHitTesting(false)
        }
    }

    private func reportList(_ report: ProfitReportResponse, _ data: ProfitChartData) -> some View {
        List {
            ProfitKpiBand(report: report, data: data, isLoading: viewModel.isLoading)
            if let err = viewModel.errorMessage {
                Section { InlineMessage(text: err, font: .footnote) }
            }
            ProfitChartsSections(report: report, data: data, canViewCost: canViewCost)
            if !report.lowMargin.isEmpty {
                ProfitLowMarginSection(items: report.lowMargin)
            }
            splitSection(report.totals)
            breakdownSection(report)
        }
        .listStyle(.insetGrouped)
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

    private func splitSection(_ totals: ProfitTotals) -> some View {
        Section {
            if canViewCost, let cost = totals.cost { MoneyRow("Tannarx", Double(cost) ?? 0) }
            MoneyRow("Yalpi foyda", totals.profitDouble)
            MoneyRow("Qaytarilgan tovarlar", Double(totals.refunded) ?? 0)
            MoneyRow("Xarajatlar", totals.expensesDouble)
            MoneyRow("Boshqa daromadlar", totals.otherIncomeDouble)
            MoneyRow("Do'kon ulushi", totals.businessShareDouble)
            MoneyRow("Investorlar ulushi", totals.investorShareDouble)
        } header: {
            Text("Foyda taqsimoti")
        } footer: {
            Text("Sof foyda = yalpi foyda − xarajatlar + boshqa daromadlar.")
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

private extension ProfitReportResponse {
    /// Zero report drawn redacted while the first load runs, so the page keeps its shape.
    static let placeholder: ProfitReportResponse = {
        let zero = #"{"sales":"0","refunded":"0","profit":"0","investorShare":"0","businessShare":"0","expenses":"0","otherIncome":"0","netProfit":"0"}"#
        let json = #"{"totals":\#(zero),"byLocation":[],"byCategory":[],"byInvestor":[],"dailyTrends":[],"lowMargin":[],"lines":{"items":[],"total":0,"page":1,"pageSize":20}}"#
        // Constant literal that matches the model, so decoding cannot fail.
        return try! JSONDecoder().decode(ProfitReportResponse.self, from: Data(json.utf8))
    }()
}
