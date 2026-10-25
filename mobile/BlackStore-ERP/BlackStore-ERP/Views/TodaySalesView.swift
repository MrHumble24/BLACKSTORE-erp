import SwiftUI

/// View displaying recent sales list made by the store with status and receipt inspection.
public struct TodaySalesView: View {
    @StateObject private var viewModel = SalesHistoryViewModel()
    @State private var filterMode: SalesFilterMode = .all

    public enum SalesFilterMode: String, CaseIterable, Identifiable {
        case all = "Barchasi"
        case debtOnly = "Nasiyalar (Qarz)"
        public var id: String { rawValue }
    }

    public init() {}

    private var displayedSales: [Sale] {
        switch filterMode {
        case .all:
            return viewModel.sales
        case .debtOnly:
            return viewModel.sales.filter { sale in
                guard let bal = sale.balance, let b = Double(bal) else { return sale.status == "DEBT" }
                return b > 0.01 || sale.status == "DEBT"
            }
        }
    }

    public var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                Picker("Filtr", selection: $filterMode) {
                    ForEach(SalesFilterMode.allCases) { mode in
                        Text(mode.rawValue).tag(mode)
                    }
                }
                .pickerStyle(.segmented)
                .padding(.horizontal)
                .padding(.vertical, 8)

                Group {
                    if viewModel.isLoading && viewModel.sales.isEmpty {
                        ProgressView("Savdolar yuklanmoqda...")
                    } else if displayedSales.isEmpty {
                        ContentUnavailableView(
                            filterMode == .debtOnly ? "Nasiya savdolar yo'q" : "Savdolar mavjud emas",
                            systemImage: filterMode == .debtOnly ? "checkmark.circle" : "cart",
                            description: Text(filterMode == .debtOnly ? "Barcha mijozlar o'z qarzlarini to'lagan." : "Hozircha hech qanday savdo amalga oshirilmagan.")
                        )
                    } else {
                        List(displayedSales) { sale in
                            NavigationLink(destination: SaleDetailView(sale: sale)) {
                                saleRow(for: sale)
                            }
                        }
                        .listStyle(.insetGrouped)
                    }
                }
            }
            .navigationTitle("Savdolar tarixi")
            .refreshable {
                await viewModel.fetchSales()
            }
            .task {
                await viewModel.fetchSales()
            }
        }
    }


    private func saleRow(for sale: Sale) -> some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 8) {
                    Text("Savdo #\(sale.id)")
                        .font(.headline)
                        .foregroundStyle(.primary)

                    statusBadge(for: sale.status)
                }

                if let customer = sale.customer {
                    Text(customer.name)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                } else {
                    Text("Noma'lum xaridor")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            Spacer()

            VStack(alignment: .trailing, spacing: 4) {
                Text(APIConfig.formatMoney(sale.total))
                    .font(.headline)
                    .foregroundStyle(.primary)

                if let bal = sale.balance, let b = Double(bal), b > 0 {
                    Text("Qarz: \(APIConfig.formatMoney(bal))")
                        .font(.caption2)
                        .foregroundStyle(.red)
                }
            }
        }
        .padding(.vertical, 4)
    }

    private func statusBadge(for status: String) -> some View {
        let isPaid = status == "PAID"
        return Text(isPaid ? "To'langan" : "Nasiya")
            .font(.caption2)
            .fontWeight(.semibold)
            .foregroundStyle(isPaid ? .green : .orange)
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
            .background((isPaid ? Color.green : Color.orange).opacity(0.12))
            .clipShape(Capsule())
    }
}
