import SwiftUI

/// Comprehensive financial reports and profit analytics view (FR-28, FR-11).
public struct ProfitReportsView: View {
    @StateObject private var viewModel = ProfitReportViewModel()
    @State private var breakdownTab: Int = 0

    public init() {}

    public var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                periodPicker

                if let err = viewModel.errorMessage {
                    errorBanner(err)
                }

                if viewModel.isLoading && viewModel.report == nil {
                    ProgressView().padding(.top, 40)
                } else if let report = viewModel.report {
                    totalsCards(for: report.totals)
                    sharesCard(for: report.totals)
                    breakdownSection(for: report)

                    if !report.lowMargin.isEmpty {
                        lowMarginSection(for: report.lowMargin)
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
        }
        .background(Color(.systemGroupedBackground))
        .navigationTitle("Foyda va hisobotlar")
        .navigationBarTitleDisplayMode(.inline)
        .task { await viewModel.fetchReport() }
        .refreshable { await viewModel.fetchReport() }
    }

    private var periodPicker: some View {
        Picker("Davr", selection: $viewModel.selectedPeriod) {
            ForEach(ProfitPeriodPreset.allCases) { preset in
                Text(preset.rawValue).tag(preset)
            }
        }
        .pickerStyle(.segmented)
        .onChange(of: viewModel.selectedPeriod) {
            Task { await viewModel.fetchReport() }
        }
    }

    private func totalsCards(for totals: ProfitTotals) -> some View {
        VStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 6) {
                Text("Sof foyda (Net profit)")
                    .font(.caption)
                    .fontWeight(.medium)
                    .foregroundStyle(.secondary)
                HStack(alignment: .firstTextBaseline) {
                    Text(String(format: "$%.2f", totals.netProfitDouble))
                        .font(.system(size: 32, weight: .bold, design: .rounded))
                        .foregroundStyle(totals.netProfitDouble >= 0 ? .green : .red)
                    Spacer()
                    Text("Jami savdo: $\(totals.sales)")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
            }
            .padding(16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color(.secondarySystemGroupedBackground))
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))

            HStack(spacing: 12) {
                metricTile(
                    title: "Yalpi foyda",
                    amount: String(format: "$%.2f", totals.profitDouble),
                    color: .blue
                )
                metricTile(
                    title: "Chiqimlar",
                    amount: String(format: "$%.2f", totals.expensesDouble),
                    color: .orange
                )
            }
        }
    }

    private func metricTile(title: String, amount: String, color: Color) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(.caption2)
                .foregroundStyle(.secondary)
            Text(amount)
                .font(.headline)
                .fontWeight(.bold)
                .foregroundStyle(color)
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    }

    private func sharesCard(for totals: ProfitTotals) -> some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 2) {
                Text("Do'kon ulushi")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                Text(String(format: "$%.2f", totals.businessShareDouble))
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundStyle(.primary)
            }
            .frame(maxWidth: .infinity, alignment: .leading)

            Divider()

            VStack(alignment: .leading, spacing: 2) {
                Text("Investorlar ulushi")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                Text(String(format: "$%.2f", totals.investorShareDouble))
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundStyle(.purple)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(14)
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    }

    private func breakdownSection(for report: ProfitReportResponse) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Picker("Tahlil", selection: $breakdownTab) {
                Text("Filiallar").tag(0)
                Text("Kategoriyalar").tag(1)
                Text("Investorlar").tag(2)
            }
            .pickerStyle(.segmented)

            let groups = breakdownTab == 0 ? report.byLocation :
                         breakdownTab == 1 ? report.byCategory : report.byInvestor

            if groups.isEmpty {
                Text("Ma'lumot topilmadi")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .padding(.vertical, 8)
            } else {
                ForEach(groups) { group in
                    groupRow(for: group)
                }
            }
        }
        .padding(16)
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
    }

    private func groupRow(for group: ProfitGroup) -> some View {
        VStack(spacing: 4) {
            HStack {
                Text(group.name)
                    .font(.subheadline)
                    .fontWeight(.medium)
                Spacer()
                Text(String(format: "$%.2f", group.profitDouble))
                    .font(.subheadline)
                    .fontWeight(.bold)
                    .foregroundStyle(.green)
            }
            HStack {
                Text("\(group.quantity) ta sotuv")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                Spacer()
                Text("Savdo: $\(group.sales)")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
            Divider().padding(.top, 2)
        }
    }

    private func lowMarginSection(for items: [LowMarginItem]) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Label("Kam marjali sotuvlar (<10%)", systemImage: "exclamationmark.triangle.fill")
                .font(.subheadline)
                .fontWeight(.bold)
                .foregroundStyle(.orange)

            ForEach(items) { item in
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(item.productModel)
                            .font(.caption)
                            .fontWeight(.medium)
                        Text("Savdo: $\(item.salePrice)")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }
                    Spacer()
                    VStack(alignment: .trailing, spacing: 2) {
                        Text("+\(item.profit)$")
                            .font(.caption)
                            .fontWeight(.semibold)
                            .foregroundStyle(.orange)
                        Text("\(String(format: "%.1f", item.marginPct))% marja")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }
                }
                Divider()
            }
        }
        .padding(16)
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
    }

    private func errorBanner(_ msg: String) -> some View {
        Text(msg)
            .font(.caption)
            .foregroundStyle(.red)
            .padding(12)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color.red.opacity(0.1))
            .clipShape(RoundedRectangle(cornerRadius: 8))
    }
}
