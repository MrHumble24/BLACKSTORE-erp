import SwiftUI

/// Main consignment management view for partner shops and device handovers (FR-26, W4).
public struct ConsignmentsView: View {
    @StateObject private var viewModel = ConsignmentsViewModel()
    @State private var isShowingHandoverSheet: Bool = false
    @State private var selectedPartnerFilter: Int? = nil

    public init() {}

    public var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                partnerFilterBar

                if let err = viewModel.errorMessage {
                    bannerView(text: err, color: .red)
                }
                if let succ = viewModel.successMessage {
                    bannerView(text: succ, color: .green)
                }

                if viewModel.isLoading && viewModel.consignments.isEmpty {
                    ProgressView().padding(.top, 40)
                    Spacer()
                } else if viewModel.consignments.isEmpty {
                    emptyPlaceholder
                } else {
                    consignmentsList
                }
            }
            .navigationTitle("Konsignatsiya")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button {
                        isShowingHandoverSheet = true
                    } label: {
                        Label("Topshirish", systemImage: "plus.circle.fill")
                    }
                }
            }
            .task {
                await viewModel.fetchPartners()
                await viewModel.fetchConsignments()
            }
            .refreshable {
                await viewModel.fetchPartners()
                await viewModel.fetchConsignments(partnerId: selectedPartnerFilter)
            }
            .sheet(isPresented: $isShowingHandoverSheet) {
                ConsignmentHandoverSheet(viewModel: viewModel)
            }
        }
    }

    private var partnerFilterBar: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                partnerChip(title: "Barchasi", count: viewModel.consignments.count, isSelected: selectedPartnerFilter == nil) {
                    selectedPartnerFilter = nil
                    Task { await viewModel.fetchConsignments() }
                }

                ForEach(viewModel.partners) { partner in
                    partnerChip(
                        title: partner.name,
                        count: partner.held ?? 0,
                        hasDebt: (Double(partner.totalOwed ?? "0") ?? 0) > 0,
                        isSelected: selectedPartnerFilter == partner.id
                    ) {
                        selectedPartnerFilter = partner.id
                        Task { await viewModel.fetchConsignments(partnerId: partner.id) }
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 8)
        }
        .background(Color(.secondarySystemBackground))
    }

    private func partnerChip(title: String, count: Int, hasDebt: Bool = false, isSelected: Bool, action: @escaping () -> Void) -> some View {
        Button(action: {
            HapticManager.selection()
            action()
        }) {
            HStack(spacing: 4) {
                Text(title)
                if count > 0 {
                    Text("\(count)")
                        .font(.caption2)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(isSelected ? Color.white.opacity(0.3) : Color(.tertiarySystemFill))
                        .clipShape(Capsule())
                }
                if hasDebt {
                    Circle()
                        .fill(Color.orange)
                        .frame(width: 6, height: 6)
                }
            }
            .font(.subheadline)
            .fontWeight(isSelected ? .semibold : .regular)
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
            .background(isSelected ? Color.blue : Color(.systemBackground))
            .foregroundStyle(isSelected ? .white : .primary)
            .clipShape(Capsule())
        }
    }

    private var consignmentsList: some View {
        List {
            ForEach(viewModel.consignments) { record in
                NavigationLink(destination: ConsignmentDetailView(consignmentId: record.id, parentVM: viewModel)) {
                    consignmentRow(for: record)
                }
            }
        }
        .listStyle(.insetGrouped)
    }

    private func consignmentRow(for record: ConsignmentRecord) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(record.partner.name)
                    .font(.headline)
                Spacer()
                if record.heldCount > 0 {
                    Text("\(record.heldCount) ta qolgan")
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundStyle(.blue)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 3)
                        .background(Color.blue.opacity(0.12))
                        .clipShape(Capsule())
                } else {
                    Text("Yakunlangan")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 3)
                        .background(Color(.tertiarySystemFill))
                        .clipShape(Capsule())
                }
            }

            HStack {
                Label(formattedDate(record.date), systemImage: "calendar")
                    .font(.caption2)
                    .foregroundStyle(.secondary)

                if let due = record.dueDate {
                    Spacer()
                    Label("Muddat: \(due)", systemImage: "clock")
                        .font(.caption2)
                        .foregroundStyle(.orange)
                }
            }

            if let note = record.note, !note.isEmpty {
                Text(note)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }
        }
        .padding(.vertical, 4)
    }

    private var emptyPlaceholder: some View {
        VStack(spacing: 12) {
            Spacer()
            Image(systemName: "arrow.up.right.square")
                .font(.system(size: 48))
                .foregroundStyle(.secondary)
            Text("Konsignatsiya ma'lumotlari yo'q")
                .font(.headline)
            Text("Hamkorlarga sotish uchun mahsulot topshiring.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
            Button {
                isShowingHandoverSheet = true
            } label: {
                Label("Yangi topshirish", systemImage: "plus")
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
