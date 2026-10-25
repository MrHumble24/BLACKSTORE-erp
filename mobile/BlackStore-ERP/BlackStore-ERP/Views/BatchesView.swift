import SwiftUI

/// Batches list view for tracking incoming supplier shipments (FR-16).
public struct BatchesView: View {
    @StateObject private var viewModel = BatchesViewModel()
    @State private var isShowingCreateSheet: Bool = false

    public init() {}

    public var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                if let err = viewModel.errorMessage {
                    bannerView(text: err, color: .red)
                }
                if let succ = viewModel.successMessage {
                    bannerView(text: succ, color: .green)
                }

                if viewModel.isLoading && viewModel.batches.isEmpty {
                    ProgressView().padding(.top, 40)
                    Spacer()
                } else if viewModel.batches.isEmpty {
                    emptyPlaceholder
                } else {
                    batchesList
                }
            }
            .navigationTitle("Partiyalar (Qabul qilish)")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button {
                        isShowingCreateSheet = true
                    } label: {
                        Label("Yangi partiya", systemImage: "plus.circle.fill")
                    }
                }
            }
            .task {
                await viewModel.loadPrerequisites()
                await viewModel.fetchBatches()
            }
            .refreshable {
                await viewModel.fetchBatches()
            }
            .sheet(isPresented: $isShowingCreateSheet) {
                CreateBatchSheet(viewModel: viewModel)
            }
        }
    }

    private var batchesList: some View {
        List {
            ForEach(viewModel.batches) { batch in
                NavigationLink(destination: BatchDetailView(batchId: batch.id, parentVM: viewModel)) {
                    batchRow(for: batch)
                }
            }
        }
        .listStyle(.insetGrouped)
    }

    private func batchRow(for batch: BatchSummary) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(batch.supplier.name)
                    .font(.headline)
                Spacer()
                Text(batch.location.name)
                    .font(.caption2)
                    .fontWeight(.semibold)
                    .foregroundStyle(.blue)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(Color.blue.opacity(0.12))
                    .clipShape(Capsule())
            }

            HStack {
                if let date = batch.arrivalDate {
                    Label(date, systemImage: "calendar")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }

                Spacer()

                if let count = batch.itemCount {
                    Text("\(count) ta qurilma")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            if let track = batch.trackingNumber, !track.isEmpty {
                Label("Trek: \(track)", systemImage: "number")
                    .font(.caption2)
                    .foregroundStyle(.tertiary)
            }
        }
        .padding(.vertical, 4)
    }

    private var emptyPlaceholder: some View {
        VStack(spacing: 12) {
            Spacer()
            Image(systemName: "shippingbox")
                .font(.system(size: 48))
                .foregroundStyle(.secondary)
            Text("Partiyalar mavjud emas")
                .font(.headline)
            Text("Yetkazib beruvchidan yangi partiya oching va qurilmalarni qabul qiling.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
            Button {
                isShowingCreateSheet = true
            } label: {
                Label("Yangi partiya ochish", systemImage: "plus")
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
}
