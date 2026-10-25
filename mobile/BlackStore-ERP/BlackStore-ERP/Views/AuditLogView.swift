import SwiftUI

/// Audit trail timeline view for tracking system mutations (FR-30).
public struct AuditLogView: View {
    @StateObject private var viewModel = SystemAdminViewModel()

    public init() {}

    public var body: some View {
        List {
            if let err = viewModel.errorMessage {
                Section { Text(err).font(.caption).foregroundStyle(.red) }
            }

            if viewModel.isLoading && viewModel.auditLogs.isEmpty {
                Section { ProgressView().padding(.vertical, 20) }
            } else if viewModel.auditLogs.isEmpty {
                Section { Text("Audit voqealari mavjud emas").foregroundStyle(.secondary) }
            } else {
                ForEach(viewModel.auditLogs) { log in
                    logRow(for: log)
                }
            }
        }
        .listStyle(.insetGrouped)
        .navigationTitle("Audit jurnali")
        .navigationBarTitleDisplayMode(.inline)
        .task { await viewModel.fetchAuditLogs() }
        .refreshable { await viewModel.fetchAuditLogs() }
    }

    private func logRow(for log: AuditLogItem) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                actionBadge(log.action)
                Text(log.entity).font(.subheadline).fontWeight(.semibold)
                Text("#\(log.entityId)").font(.caption).foregroundStyle(.secondary)
                Spacer()
                Text(log.createdAt.prefix(16).replacingOccurrences(of: "T", with: " "))
                    .font(.caption2)
                    .foregroundStyle(.tertiary)
            }

            if let u = log.user {
                Label(u.name, systemImage: "person.circle")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(.vertical, 2)
    }

    private func actionBadge(_ action: String) -> some View {
        let act = action.lowercased()
        let color: Color = act == "create" ? .green : act == "delete" ? .red : .blue
        let label = act == "create" ? "Yaratildi" : act == "delete" ? "O'chirildi" : "O'zgartirildi"

        return Text(label)
            .font(.caption2)
            .fontWeight(.semibold)
            .foregroundStyle(color)
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
            .background(color.opacity(0.12))
            .clipShape(Capsule())
    }
}
