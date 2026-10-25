import SwiftUI

/// Batches list for tracking incoming supplier shipments (FR-16).
public struct BatchesView: View {
    @StateObject private var viewModel = BatchesViewModel()
    @State private var isShowingCreateSheet = false
    @State private var searchText = ""

    public init() {}

    public var body: some View {
        content
            .navigationTitle("Partiyalar")
            .navigationBarTitleDisplayMode(.inline)
            .searchable(text: $searchText, prompt: "Yetkazib beruvchi, ombor yoki trek")
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button { isShowingCreateSheet = true } label: {
                        Label("Yangi partiya", systemImage: "plus")
                    }
                }
            }
            .task {
                await viewModel.loadPrerequisites()
                await viewModel.fetchBatches()
            }
            .refreshable { await viewModel.fetchBatches() }
            .sheet(isPresented: $isShowingCreateSheet) {
                CreateBatchSheet(viewModel: viewModel)
            }
    }

    @ViewBuilder
    private var content: some View {
        if viewModel.isLoading && viewModel.batches.isEmpty {
            LoadingState()
        } else if let err = viewModel.errorMessage, viewModel.batches.isEmpty {
            ErrorState(message: err) { await viewModel.fetchBatches() }
        } else if viewModel.batches.isEmpty {
            emptyState
        } else {
            batchesList
        }
    }

    /// Batches matching the search text by supplier, location or tracking number.
    private var filteredBatches: [BatchSummary] {
        let query = searchText.trimmingCharacters(in: .whitespaces)
        guard !query.isEmpty else { return viewModel.batches }
        return viewModel.batches.filter {
            ($0.supplier?.name ?? "").localizedCaseInsensitiveContains(query)
                || ($0.location?.name ?? "").localizedCaseInsensitiveContains(query)
                || ($0.trackingNumber ?? "").localizedCaseInsensitiveContains(query)
        }
    }

    private var batchesList: some View {
        List {
            if let err = viewModel.errorMessage {
                Section { InlineMessage(text: err) }
            }
            Section {
                ForEach(filteredBatches) { batch in
                    NavigationLink {
                        BatchDetailView(batchId: batch.id, parentVM: viewModel)
                    } label: {
                        BatchRow(batch: batch)
                    }
                }
            } footer: {
                Text("Partiyani oching va qurilmalarni skanerlab qabul qiling.")
            }
        }
        .listStyle(.insetGrouped)
        .overlay {
            if filteredBatches.isEmpty { ContentUnavailableView.search(text: searchText) }
        }
    }

    private var emptyState: some View {
        MessagePanel(title: "Partiyalar mavjud emas", systemImage: "shippingbox",
                     message: "Yetkazib beruvchidan yangi partiya oching va qurilmalarni qabul qiling.") {
            Button { isShowingCreateSheet = true } label: {
                Label("Yangi partiya ochish", systemImage: "plus")
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.large)
        }
    }
}

/// One batch row: supplier, location, arrival date, device count and tracking number.
private struct BatchRow: View {
    let batch: BatchSummary

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(alignment: .firstTextBaseline) {
                Text(batch.supplier?.name ?? "Yetkazib beruvchi").font(.headline)
                Spacer()
                StatusBadge(text: batch.location?.name ?? "Filial")
            }
            if let inv = batch.investor {
                Text("Mulkdor: \(inv.name) (\(inv.code))")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            HStack {
                if let date = batch.arrivalDate {
                    Label(date, systemImage: "calendar")
                }
                Spacer()
                if let count = batch.itemCount {
                    Text("\(count) ta qurilma").monospacedDigit()
                }
            }
            .font(.subheadline)
            .foregroundStyle(.secondary)
            if let note = batch.note, !note.isEmpty {
                Text(note)
                    .font(.caption2)
                    .foregroundStyle(.tertiary)
                    .lineLimit(1)
            }
        }
        .padding(.vertical, 4)
        .accessibilityElement(children: .combine)
    }
}
