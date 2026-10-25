import SwiftUI

/// Database backups list and manual trigger view (FR-31).
public struct BackupsView: View {
    @StateObject private var viewModel = SystemAdminViewModel()

    public init() {}

    public var body: some View {
        List {
            if let err = viewModel.errorMessage {
                Section { Text(err).font(.caption).foregroundStyle(.red) }
            }
            if let succ = viewModel.successMessage {
                Section { Text(succ).font(.caption).foregroundStyle(.green) }
            }

            triggerSection

            backupsListSection
        }
        .listStyle(.insetGrouped)
        .navigationTitle("Zaxira nusxalari (Backups)")
        .navigationBarTitleDisplayMode(.inline)
        .task { await viewModel.fetchBackups() }
        .refreshable { await viewModel.fetchBackups() }
    }

    private var triggerSection: some View {
        Section {
            Button {
                Task { await viewModel.triggerBackup() }
            } label: {
                HStack {
                    Label("Hozir zaxira olish (Telegramga jo'natish)", systemImage: "arrow.clockwise.icloud.fill")
                    Spacer()
                    if viewModel.isLoading {
                        ProgressView()
                    }
                }
            }
            .disabled(viewModel.isLoading)
        }
    }

    private var backupsListSection: some View {
        Section("Mavjud nusxalar (\(viewModel.backups.count))") {
            if viewModel.isLoading && viewModel.backups.isEmpty {
                ProgressView().padding(.vertical, 10)
            } else if viewModel.backups.isEmpty {
                Text("Zaxira nusxalari topilmadi").font(.caption).foregroundStyle(.secondary)
            } else {
                ForEach(viewModel.backups) { backup in
                    backupRow(for: backup)
                }
            }
        }
    }

    private func backupRow(for b: BackupItem) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text(b.fileName)
                    .font(.caption)
                    .fontWeight(.medium)
                    .lineLimit(1)
                Spacer()
                Text(b.sizeFormatted)
                    .font(.caption)
                    .fontWeight(.bold)
            }

            HStack {
                Text(b.createdAt.prefix(16).replacingOccurrences(of: "T", with: " "))
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                Spacer()
                if b.sentToTelegram {
                    Label("Telegramga yuborilgan", systemImage: "paperplane.fill")
                        .font(.caption2)
                        .foregroundStyle(.blue)
                }
            }
        }
        .padding(.vertical, 2)
    }
}
