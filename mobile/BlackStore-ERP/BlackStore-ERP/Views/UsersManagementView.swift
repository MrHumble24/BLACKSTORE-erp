import SwiftUI

/// Staff and users administration view (FR-29).
public struct UsersManagementView: View {
    @StateObject private var viewModel = UsersViewModel()
    @State private var isShowingCreateSheet: Bool = false

    public init() {}

    public var body: some View {
        List {
            if let err = viewModel.errorMessage {
                Section { Text(err).font(.caption).foregroundStyle(.red) }
            }

            if viewModel.isLoading && viewModel.users.isEmpty {
                Section { ProgressView().padding(.vertical, 20) }
            } else {
                ForEach(viewModel.users) { user in
                    userRow(for: user)
                }
            }
        }
        .listStyle(.insetGrouped)
        .navigationTitle("Xodimlar boshqaruvi")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button {
                    isShowingCreateSheet = true
                } label: {
                    Label("Yangi xodim", systemImage: "person.badge.plus")
                }
            }
        }
        .task { await viewModel.fetchUsers() }
        .refreshable { await viewModel.fetchUsers() }
        .sheet(isPresented: $isShowingCreateSheet) {
            CreateUserSheet(viewModel: viewModel)
        }
    }

    private func userRow(for user: User) -> some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 8) {
                    Text(user.name).font(.headline)
                    roleBadge(for: user.role.name)
                }
                Text(user.phone).font(.caption).foregroundStyle(.secondary)
            }
            Spacer()
            Button {
                Task { await viewModel.toggleActive(user: user) }
            } label: {
                ActiveBadge(isActive: user.isActive ?? true)
            }
            .buttonStyle(.plain)
        }
        .padding(.vertical, 2)
    }

    private func roleBadge(for roleName: String) -> some View {
        let isAdm = roleName.lowercased().contains("admin")
        return Text(roleName)
            .font(.caption2)
            .fontWeight(.medium)
            .foregroundStyle(isAdm ? .blue : .purple)
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
            .background((isAdm ? Color.blue : Color.purple).opacity(0.12))
            .clipShape(Capsule())
    }
}
