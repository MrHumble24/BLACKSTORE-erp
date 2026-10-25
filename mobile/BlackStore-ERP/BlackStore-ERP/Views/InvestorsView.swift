import SwiftUI

/// Investors overview list view (FR-8, FR-10).
public struct InvestorsView: View {
    @StateObject private var viewModel = InvestorsViewModel()

    public init() {}

    public var body: some View {
        List {
            if let err = viewModel.errorMessage {
                Section {
                    Text(err).font(.caption).foregroundStyle(.red)
                }
            }

            if viewModel.isLoading && viewModel.investors.isEmpty {
                Section {
                    ProgressView().padding(.vertical, 20)
                }
            } else if viewModel.investors.isEmpty {
                Section {
                    Text("Investorlar topilmadi")
                        .foregroundStyle(.secondary)
                }
            } else {
                ForEach(viewModel.investors) { investor in
                    NavigationLink(destination: InvestorDetailView(investorId: investor.id)) {
                        investorRow(for: investor)
                    }
                }
            }
        }
        .listStyle(.insetGrouped)
        .navigationTitle("Investorlar")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await viewModel.fetchInvestors()
        }
        .refreshable {
            await viewModel.fetchInvestors()
        }
    }

    private func investorRow(for investor: InvestorSummary) -> some View {
        HStack(spacing: 12) {
            Image(systemName: investor.isOwn ? "building.columns.fill" : "person.crop.circle.fill")
                .font(.title2)
                .foregroundStyle(investor.isOwn ? .blue : .purple)

            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text(investor.name)
                        .font(.headline)
                    if investor.isOwn {
                        Text("O'z mablag'i")
                            .font(.caption2)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(Color.blue.opacity(0.12))
                            .clipShape(Capsule())
                    }
                }

                Text("Kod: \(investor.code)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            if !investor.isActive {
                Text("Nofaol")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(Color(.systemGray5))
                    .clipShape(Capsule())
            }
        }
        .padding(.vertical, 4)
    }
}
