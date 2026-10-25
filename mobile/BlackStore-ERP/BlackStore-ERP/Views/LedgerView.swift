import SwiftUI

/// Daily expenses and other income: net total on top, then a plain statement (FR-27).
public struct LedgerView: View {
    @StateObject private var viewModel = LedgerViewModel()
    @State private var isShowingAddSheet: Bool = false
    @State private var searchText = ""

    public init() {}

    public var body: some View {
        content
            .navigationTitle("Xarajatlar & Kassa")
            .navigationBarTitleDisplayMode(.inline)
            .searchable(text: $searchText, prompt: "Kategoriya yoki izoh")
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button {
                        isShowingAddSheet = true
                    } label: {
                        Label("Kiritish", systemImage: "plus.circle.fill")
                    }
                }
            }
            .task(id: viewModel.selectedTypeFilter) { await reload() }
            .sheet(isPresented: $isShowingAddSheet) {
                AddExpenseSheet(viewModel: viewModel)
            }
    }

    private func reload() async {
        await viewModel.fetchCategories()
        await viewModel.fetchEntries(type: viewModel.selectedTypeFilter)
        // A newer filter change cancelled this load; drop its "cancelled" error.
        if Task.isCancelled { viewModel.errorMessage = nil }
    }

    /// Entries matching the search by category or note.
    private var filtered: [LedgerEntry] {
        let q = searchText.trimmingCharacters(in: .whitespaces)
        guard !q.isEmpty else { return viewModel.entries }
        return viewModel.entries.filter {
            $0.category.localizedCaseInsensitiveContains(q) || ($0.note ?? "").localizedCaseInsensitiveContains(q)
        }
    }

    @ViewBuilder
    private var content: some View {
        if viewModel.isLoading && viewModel.entries.isEmpty && viewModel.totals == nil {
            LoadingState()
        } else if let err = viewModel.errorMessage, viewModel.entries.isEmpty, viewModel.totals == nil {
            ErrorState(message: err) { await reload() }
        } else {
            List {
                if let totals = viewModel.totals { totalsHeader(totals) }
                messagesSection
                Section { typeFilterPicker }
                entriesSection
            }
            .listStyle(.insetGrouped)
            .refreshable { await reload() }
        }
    }

    private func totalsHeader(_ totals: LedgerTotals) -> some View {
        let net = Double(totals.net) ?? 0
        return PeopleAmountHeader(title: "Sof farq", amount: net, tint: peopleSignTint(net)) {
            HStack(spacing: 16) {
                Label(APIConfig.formatMoney(totals.expense), systemImage: "arrow.down.right")
                    .foregroundStyle(.red)
                Label(APIConfig.formatMoney(totals.income), systemImage: "arrow.up.left")
                    .foregroundStyle(.green)
            }
            .font(.footnote.weight(.semibold))
            .monospacedDigit()
            .accessibilityLabel("Chiqim \(APIConfig.formatMoney(totals.expense)), kirim \(APIConfig.formatMoney(totals.income))")
        }
    }

    @ViewBuilder
    private var messagesSection: some View {
        if let err = viewModel.errorMessage {
            Section { InlineMessage(text: err, font: .footnote) }
        } else if let succ = viewModel.successMessage {
            Section { InlineMessage(text: succ, isError: false, font: .footnote) }
        }
    }

    private var typeFilterPicker: some View {
        Picker("Turi", selection: $viewModel.selectedTypeFilter) {
            Text("Barchasi").tag(nil as LedgerType?)
            Text("Chiqimlar").tag(LedgerType.expense as LedgerType?)
            Text("Kirimlar").tag(LedgerType.income as LedgerType?)
        }
        .pickerStyle(.segmented)
        .listRowBackground(Color.clear)
        .listRowInsets(EdgeInsets())
    }

    @ViewBuilder
    private var entriesSection: some View {
        if viewModel.entries.isEmpty {
            ContentUnavailableView {
                Label("Yozuvlar mavjud emas", systemImage: "tray")
            } description: {
                Text("Kunlik xarajat yoki qo'shimcha daromadlarni kiriting.")
            } actions: {
                Button("Yangi kiritish") { isShowingAddSheet = true }
                    .buttonStyle(.borderedProminent)
            }
            .listRowBackground(Color.clear)
        } else if filtered.isEmpty {
            ContentUnavailableView.search(text: searchText)
                .listRowBackground(Color.clear)
        } else {
            Section("Yozuvlar") {
                ForEach(filtered) { entry in
                    PeopleStatementRow(
                        title: entry.category,
                        subtitle: entrySubtitle(entry),
                        date: entry.date,
                        amount: (Double(entry.amount) ?? 0) * (entry.isExpense ? -1 : 1)
                    )
                }
            }
        }
    }

    /// Note plus a "Naqd" marker when paid from the cash drawer.
    private func entrySubtitle(_ entry: LedgerEntry) -> String? {
        let parts = [entry.note, entry.inCash == true ? "Naqd" : nil]
            .compactMap { $0 }
            .filter { !$0.isEmpty }
        return parts.isEmpty ? nil : parts.joined(separator: " · ")
    }
}
