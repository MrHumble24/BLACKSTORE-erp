import SwiftUI

/// Partners directory view displaying active consignment counts and total debt (FR-26).
public struct PartnersView: View {
    @StateObject private var viewModel = PartnersViewModel()
    @State private var isShowingCreateSheet: Bool = false

    public init() {}

    public var body: some View {
        List {
            if let err = viewModel.errorMessage {
                Section { Text(err).font(.caption).foregroundStyle(.red) }
            }

            if viewModel.isLoading && viewModel.partners.isEmpty {
                Section { ProgressView().padding(.vertical, 20) }
            } else if viewModel.partners.isEmpty {
                Section { Text("Hamkorlar mavjud emas").foregroundStyle(.secondary) }
            } else {
                ForEach(viewModel.partners) { partner in
                    NavigationLink(destination: ConsignmentsView()) {
                        partnerRow(for: partner)
                    }
                }
            }
        }
        .listStyle(.insetGrouped)
        .navigationTitle("Hamkor do'konlar")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button {
                    isShowingCreateSheet = true
                } label: {
                    Label("Yangi hamkor", systemImage: "plus.circle.fill")
                }
            }
        }
        .task { await viewModel.fetchPartners() }
        .refreshable { await viewModel.fetchPartners() }
        .sheet(isPresented: $isShowingCreateSheet) {
            CreatePartnerSheet(viewModel: viewModel)
        }
    }

    private func partnerRow(for p: PartnerReportItem) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(p.name).font(.headline)
                Spacer()
                if p.totalOwedDouble > 0 {
                    Text(APIConfig.formatMoney(p.totalOwedDouble))
                        .font(.subheadline)
                        .fontWeight(.bold)
                        .foregroundStyle(.red)
                }
            }

            HStack {
                Label(p.phone, systemImage: "phone")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                if let loc = p.marketLocation, !loc.isEmpty {
                    Spacer()
                    Label(loc, systemImage: "mappin.and.ellipse")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
            }

            HStack(spacing: 8) {
                badge(text: "\(p.heldCount) ta topshirilgan", color: .blue)
                if p.soldUnpaidCount > 0 {
                    badge(text: "\(p.soldUnpaidCount) ta to'lanmagan", color: .orange)
                }
                if p.overdueCount > 0 {
                    badge(text: "\(p.overdueCount) ta muddati o'tgan", color: .red)
                }
            }
        }
        .padding(.vertical, 4)
    }

    private func badge(text: String, color: Color) -> some View {
        Text(text)
            .font(.caption2)
            .fontWeight(.medium)
            .foregroundStyle(color)
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
            .background(color.opacity(0.12))
            .clipShape(Capsule())
    }
}
