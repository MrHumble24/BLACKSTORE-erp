import SwiftUI

/// Recent sales list with a paid/debt filter, search, and a link to each sale.
public struct TodaySalesView: View {
    @StateObject private var viewModel = SalesHistoryViewModel()
    @State private var filterMode: SalesFilterMode = .all
    @State private var searchText = ""

    public enum SalesFilterMode: String, CaseIterable, Identifiable {
        case all = "Barchasi"
        case debtOnly = "Nasiyalar (Qarz)"
        public var id: String { rawValue }
    }

    public init() {}

    /// Sales after the filter and the search text (sale number, customer name or phone).
    private var displayedSales: [Sale] {
        let query = searchText.trimmingCharacters(in: .whitespaces).lowercased()
        return viewModel.sales.filter { sale in
            let matchesFilter = filterMode == .all || sale.status == "DEBT" || SalesFormat.debt(of: sale) != nil
            guard matchesFilter, !query.isEmpty else { return matchesFilter }
            return "\(sale.id)".contains(query)
                || sale.customer?.name.lowercased().contains(query) == true
                || sale.customer?.phone.contains(query) == true
        }
    }

    public var body: some View {
        NavigationStack {
            List {
                Section {
                    Picker("Filtr", selection: $filterMode) {
                        ForEach(SalesFilterMode.allCases) { Text($0.rawValue).tag($0) }
                    }
                    .pickerStyle(.segmented)
                    .listRowBackground(Color.clear)
                    .listRowInsets(EdgeInsets())
                }
                if displayedSales.isEmpty {
                    Section { stateView }.listRowBackground(Color.clear)
                } else {
                    Section {
                        ForEach(displayedSales) { sale in
                            NavigationLink(destination: SaleDetailView(sale: sale)) { SaleRow(sale: sale) }
                        }
                    } footer: {
                        Text("Oxirgi savdolar ko'rsatilgan.")
                    }
                }
            }
            .listStyle(.insetGrouped)
            .navigationTitle("Savdolar tarixi")
            .searchable(text: $searchText, prompt: "Savdo raqami, ism yoki telefon")
            .refreshable { await viewModel.fetchSales() }
            .task { await viewModel.fetchSales() }
        }
    }

    /// Loading, error and empty states shown in place of the rows so the screen is never blank.
    @ViewBuilder
    private var stateView: some View {
        if viewModel.isLoading && viewModel.sales.isEmpty {
            ProgressView("Savdolar yuklanmoqda...").frame(maxWidth: .infinity, minHeight: 160)
        } else if let err = viewModel.errorMessage, viewModel.sales.isEmpty {
            ContentUnavailableView {
                Label("Yuklab bo'lmadi", systemImage: "wifi.exclamationmark")
            } description: {
                Text(err)
            } actions: {
                Button("Qayta urinish") { Task { await viewModel.fetchSales() } }
                    .buttonStyle(.borderedProminent)
            }
        } else if !searchText.isEmpty {
            ContentUnavailableView.search(text: searchText)
        } else {
            ContentUnavailableView(
                filterMode == .debtOnly ? "Nasiya savdolar yo'q" : "Savdolar mavjud emas",
                systemImage: filterMode == .debtOnly ? "checkmark.circle" : "cart",
                description: Text(filterMode == .debtOnly ? "Barcha mijozlar o'z qarzlarini to'lagan." : "Hozircha hech qanday savdo amalga oshirilmagan.")
            )
        }
    }
}
