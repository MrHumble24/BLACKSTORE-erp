import SwiftUI

/// Daily expense and petty cash ledger view (FR-27).
public struct LedgerView: View {
    @StateObject private var viewModel = LedgerViewModel()
    @State private var isShowingAddSheet: Bool = false

    public init() {}

    public var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                if let totals = viewModel.totals {
                    totalsStrip(totals: totals)
                }

                typeFilterPicker

                if let err = viewModel.errorMessage {
                    bannerView(text: err, color: .red)
                }
                if let succ = viewModel.successMessage {
                    bannerView(text: succ, color: .green)
                }

                if viewModel.isLoading && viewModel.entries.isEmpty {
                    ProgressView().padding(.top, 40)
                    Spacer()
                } else if viewModel.entries.isEmpty {
                    emptyPlaceholder
                } else {
                    entriesList
                }
            }
            .navigationTitle("Xarajatlar & Kassa")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button {
                        isShowingAddSheet = true
                    } label: {
                        Label("Kiritish", systemImage: "plus.circle.fill")
                    }
                }
            }
            .task {
                await viewModel.fetchCategories()
                await viewModel.fetchEntries()
            }
            .refreshable {
                await viewModel.fetchCategories()
                await viewModel.fetchEntries(type: viewModel.selectedTypeFilter)
            }
            .sheet(isPresented: $isShowingAddSheet) {
                AddExpenseSheet(viewModel: viewModel)
            }
        }
    }

    private func totalsStrip(totals: LedgerTotals) -> some View {
        HStack(spacing: 12) {
            totalCard(title: "Chiqim", amount: totals.expense, color: .red)
            totalCard(title: "Boshqa kirim", amount: totals.income, color: .green)
            totalCard(title: "Sof farq", amount: totals.net, color: .primary)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 8)
        .background(Color(.secondarySystemBackground))
    }

    private func totalCard(title: String, amount: String, color: Color) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(title)
                .font(.caption2)
                .foregroundStyle(.secondary)
            Text(APIConfig.formatMoney(amount))
                .font(.subheadline)
                .fontWeight(.bold)
                .foregroundStyle(color)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(8)
        .background(Color(.systemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }

    private var typeFilterPicker: some View {
        Picker("Turi", selection: $viewModel.selectedTypeFilter) {
            Text("Barchasi").tag(nil as LedgerType?)
            Text("Chiqimlar").tag(LedgerType.expense as LedgerType?)
            Text("Kirimlar").tag(LedgerType.income as LedgerType?)
        }
        .pickerStyle(.segmented)
        .padding(.horizontal, 16)
        .padding(.vertical, 8)
        .onChange(of: viewModel.selectedTypeFilter) { _, newType in
            Task { await viewModel.fetchEntries(type: newType) }
        }
    }

    private var entriesList: some View {
        List {
            ForEach(viewModel.entries) { entry in
                entryRow(for: entry)
            }
        }
        .listStyle(.insetGrouped)
    }

    private func entryRow(for entry: LedgerEntry) -> some View {
        HStack(spacing: 12) {
            Image(systemName: entry.isExpense ? "arrow.down.right.circle.fill" : "arrow.up.left.circle.fill")
                .font(.title2)
                .foregroundStyle(entry.isExpense ? .red : .green)

            VStack(alignment: .leading, spacing: 3) {
                Text(entry.category)
                    .font(.headline)

                if let note = entry.note, !note.isEmpty {
                    Text(note)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                HStack {
                    Text(formattedDate(entry.date))
                        .font(.caption2)
                        .foregroundStyle(.tertiary)

                    if entry.inCash == true {
                        Text("Naqd")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                            .padding(.horizontal, 4)
                            .padding(.vertical, 1)
                            .background(Color(.tertiarySystemFill))
                            .clipShape(RoundedRectangle(cornerRadius: 4))
                    }
                }
            }

            Spacer()

            Text("\(entry.isExpense ? "-" : "+")\(APIConfig.formatMoney(entry.amount))")
                .font(.subheadline)
                .fontWeight(.bold)
                .foregroundStyle(entry.isExpense ? .red : .green)
        }
        .padding(.vertical, 2)
    }

    private var emptyPlaceholder: some View {
        VStack(spacing: 12) {
            Spacer()
            Image(systemName: "tray")
                .font(.system(size: 48))
                .foregroundStyle(.secondary)
            Text("Yozuvlar mavjud emas")
                .font(.headline)
            Text("Kunlik xarajat yoki qo'shimcha daromadlarni kiriting.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
            Button {
                isShowingAddSheet = true
            } label: {
                Label("Yangi kiritish", systemImage: "plus")
            }
            .buttonStyle(.borderedProminent)
            .padding(.top, 8)
            Spacer()
        }
    }

    private func bannerView(text: String, color: Color) -> some View {
        Text(text)
            .font(.caption)
            .foregroundStyle(color)
            .padding(.horizontal, 16)
            .padding(.vertical, 6)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(color.opacity(0.1))
    }

    private func formattedDate(_ isoDate: String) -> String {
        guard let date = ISO8601DateFormatter().date(from: isoDate) else { return isoDate }
        return date.formatted(date: .abbreviated, time: .shortened)
    }
}
