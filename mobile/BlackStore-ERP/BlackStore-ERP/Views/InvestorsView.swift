import SwiftUI

/// Investor list with search; tap an investor to open their account (FR-8, FR-10).
public struct InvestorsView: View {
    @StateObject private var viewModel = InvestorsViewModel()
    @State private var searchText = ""

    public init() {}

    public var body: some View {
        content
            .navigationTitle("Investorlar")
            .navigationBarTitleDisplayMode(.inline)
            .searchable(text: $searchText, prompt: "Ism yoki kod")
            .task { await viewModel.fetchInvestors() }
    }

    /// Investors matching the search by name or code.
    private var filtered: [InvestorSummary] {
        let q = searchText.trimmingCharacters(in: .whitespaces)
        guard !q.isEmpty else { return viewModel.investors }
        return viewModel.investors.filter {
            $0.name.localizedCaseInsensitiveContains(q) || $0.code.localizedCaseInsensitiveContains(q)
        }
    }

    @ViewBuilder
    private var content: some View {
        if viewModel.isLoading && viewModel.investors.isEmpty {
            PeopleLoadingState()
        } else if let err = viewModel.errorMessage, viewModel.investors.isEmpty {
            PeopleErrorState(message: err) { await viewModel.fetchInvestors() }
        } else if viewModel.investors.isEmpty {
            ContentUnavailableView("Investorlar topilmadi", systemImage: "person.2.slash")
        } else if filtered.isEmpty {
            ContentUnavailableView.search(text: searchText)
        } else {
            List {
                if let err = viewModel.errorMessage {
                    PeopleInlineError(message: err)
                }
                Section {
                    ForEach(filtered) { investor in
                        NavigationLink(destination: InvestorDetailView(investorId: investor.id)) {
                            InvestorRow(investor: investor)
                        }
                    }
                }
            }
            .listStyle(.insetGrouped)
            .refreshable { await viewModel.fetchInvestors() }
        }
    }
}

/// One investor: icon, name, code, and own-money / inactive badges.
private struct InvestorRow: View {
    let investor: InvestorSummary

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: investor.isOwn ? "building.columns.fill" : "person.crop.circle.fill")
                .font(.title2)
                .foregroundStyle(investor.isOwn ? Color.accentColor : Color.purple)
                .frame(width: 44, height: 44)
                .accessibilityHidden(true)

            VStack(alignment: .leading, spacing: 2) {
                Text(investor.name).font(.headline)
                Text("Kod: \(investor.code)")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            Spacer(minLength: 8)

            if investor.isOwn { badge("O'z mablag'i") }
            if !investor.isActive { badge("Nofaol") }
        }
        .padding(.vertical, 2)
        .accessibilityElement(children: .combine)
    }

    private func badge(_ text: String) -> some View {
        Text(text)
            .font(.caption)
            .foregroundStyle(.secondary)
            .padding(.horizontal, 8)
            .padding(.vertical, 3)
            .background(Color(.tertiarySystemFill), in: Capsule())
    }
}
