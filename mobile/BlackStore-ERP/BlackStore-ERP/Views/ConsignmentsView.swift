import SwiftUI

/// Consignment list for partner shops and device handovers (FR-26, W4).
public struct ConsignmentsView: View {
    @StateObject private var viewModel = ConsignmentsViewModel()
    @State private var isShowingHandoverSheet = false
    @State private var selectedPartnerFilter: Int? = nil
    @State private var searchText = ""

    public init() {}

    public var body: some View {
        content
            .safeAreaInset(edge: .top, spacing: 0) {
                PartnerFilterBar(
                    partners: viewModel.partners,
                    totalCount: viewModel.consignments.count,
                    selection: selectedPartnerFilter,
                    onSelect: selectPartner
                )
            }
            .navigationTitle("Konsignatsiya")
            .navigationBarTitleDisplayMode(.inline)
            .searchable(text: $searchText, prompt: "Hamkor yoki izoh")
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button { isShowingHandoverSheet = true } label: {
                        Label("Topshirish", systemImage: "plus")
                    }
                }
            }
            .task {
                viewModel.successMessage = nil
                await reload()
            }
            .refreshable { await reload() }
            .sheet(isPresented: $isShowingHandoverSheet) {
                ConsignmentHandoverSheet(viewModel: viewModel)
            }
    }

    @ViewBuilder
    private var content: some View {
        if viewModel.isLoading && viewModel.consignments.isEmpty {
            ProgressView("Yuklanmoqda…")
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        } else if let err = viewModel.errorMessage, viewModel.consignments.isEmpty {
            ContentUnavailableView {
                Label("Yuklab bo'lmadi", systemImage: "wifi.exclamationmark")
            } description: {
                Text(err)
            } actions: {
                Button("Qayta urinish") { Task { await reload() } }
                    .buttonStyle(.borderedProminent)
            }
        } else if viewModel.consignments.isEmpty {
            emptyState
        } else {
            consignmentsList
        }
    }

    /// Consignments matching the search text by partner name or note.
    private var filteredConsignments: [ConsignmentRecord] {
        let query = searchText.trimmingCharacters(in: .whitespaces)
        guard !query.isEmpty else { return viewModel.consignments }
        return viewModel.consignments.filter {
            $0.partner.name.localizedCaseInsensitiveContains(query)
                || ($0.note ?? "").localizedCaseInsensitiveContains(query)
        }
    }

    private var consignmentsList: some View {
        List {
            if let msg = viewModel.errorMessage ?? viewModel.successMessage {
                Section { StockMessageRow(text: msg, isError: viewModel.errorMessage != nil) }
            }
            Section {
                ForEach(filteredConsignments) { record in
                    NavigationLink {
                        ConsignmentDetailView(consignmentId: record.id, parentVM: viewModel)
                    } label: {
                        ConsignmentRow(record: record)
                    }
                }
            } footer: {
                Text("Hamkorlarga sotish uchun berilgan mahsulotlar.")
            }
        }
        .listStyle(.insetGrouped)
        .overlay {
            if filteredConsignments.isEmpty { ContentUnavailableView.search(text: searchText) }
        }
    }

    private var emptyState: some View {
        ContentUnavailableView {
            Label("Konsignatsiya yo'q", systemImage: "arrow.up.right.square")
        } description: {
            Text("Hamkorlarga sotish uchun mahsulot topshiring.")
        } actions: {
            Button { isShowingHandoverSheet = true } label: {
                Label("Yangi topshirish", systemImage: "plus")
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.large)
        }
    }

    private func reload() async {
        await viewModel.fetchPartners()
        await viewModel.fetchConsignments(partnerId: selectedPartnerFilter)
    }

    private func selectPartner(_ id: Int?) {
        HapticManager.selection()
        selectedPartnerFilter = id
        viewModel.selectedPartnerId = id
        Task { await viewModel.fetchConsignments(partnerId: id) }
    }
}
