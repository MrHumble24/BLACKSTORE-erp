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
            $0.supplier.name.localizedCaseInsensitiveContains(query)
                || $0.location.name.localizedCaseInsensitiveContains(query)
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
        ContentUnavailableView {
            Label("Partiyalar mavjud emas", systemImage: "shippingbox")
        } description: {
            Text("Yetkazib beruvchidan yangi partiya oching va qurilmalarni qabul qiling.")
        } actions: {
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
                Text(batch.supplier.name).font(.headline)
                Spacer()
                StatusBadge(text: batch.location.name)
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
            if let track = batch.trackingNumber, !track.isEmpty {
                Label("Trek: \(track)", systemImage: "number")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(.vertical, 4)
        .accessibilityElement(children: .combine)
    }
}
