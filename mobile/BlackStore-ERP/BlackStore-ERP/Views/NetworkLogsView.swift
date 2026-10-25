import SwiftUI

/// Developer view for browsing and inspecting recent in-app network traffic.
public struct NetworkLogsView: View {
    @ObservedObject private var logger = NetworkLogger.shared
    @State private var filterText: String = ""

    public init() {}

    private var filteredEntries: [NetworkLogEntry] {
        let clean = filterText.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        if clean.isEmpty { return logger.entries }
        return logger.entries.filter {
            $0.url.lowercased().contains(clean) ||
            $0.method.lowercased().contains(clean) ||
            $0.statusBadgeText.contains(clean)
        }
    }

    public var body: some View {
        Group {
            if logger.entries.isEmpty {
                ContentUnavailableView(
                    "Tarmoq so'rovlari yo'q",
                    systemImage: "network",
                    description: Text("App orqali biror amal bajaring, so'rovlar bu yerda aks etadi.")
                )
            } else {
                List(filteredEntries) { entry in
                    NavigationLink(destination: NetworkLogDetailView(entry: entry)) {
                        logRow(for: entry)
                    }
                }
                .listStyle(.insetGrouped)
            }
        }
        .searchable(text: $filterText, prompt: "Filterlash (GET, /sales, 200...)")
        .navigationTitle("Network Logs (\(logger.entries.count))")
        .toolbar {
            if !logger.entries.isEmpty {
                ToolbarItem(placement: .primaryAction) {
                    Button(role: .destructive) {
                        logger.clear()
                        HapticManager.medium()
                    } label: {
                        Label("Tozalash", systemImage: "trash")
                    }
                }
            }
        }
    }

    private func logRow(for entry: NetworkLogEntry) -> some View {
        HStack(spacing: 12) {
            badgeView(for: entry)

            VStack(alignment: .leading, spacing: 3) {
                HStack {
                    Text(entry.method)
                        .font(.caption)
                        .fontWeight(.bold)
                        .foregroundStyle(.primary)

                    Text(endpointPath(from: entry.url))
                        .font(.caption)
                        .lineLimit(1)
                        .truncationMode(.middle)
                        .foregroundStyle(.secondary)
                }

                HStack {
                    Text(entry.timestamp.formatted(date: .omitted, time: .standard))
                        .font(.caption2)
                        .foregroundStyle(.tertiary)

                    Spacer()

                    Text(entry.formattedDuration)
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
            }
        }
        .padding(.vertical, 2)
    }

    private func badgeView(for entry: NetworkLogEntry) -> some View {
        let color: Color
        if entry.isSuccess {
            color = .green
        } else if entry.statusCode != nil || entry.errorMessage != nil {
            color = .red
        } else {
            color = .blue
        }

        return Text(entry.statusBadgeText)
            .font(.caption2)
            .fontWeight(.bold)
            .foregroundStyle(color)
            .frame(width: 44)
            .padding(.vertical, 4)
            .background(color.opacity(0.12))
            .clipShape(RoundedRectangle(cornerRadius: 6))
    }

    private func endpointPath(from fullUrl: String) -> String {
        guard let url = URL(string: fullUrl) else { return fullUrl }
        let query = url.query.map { "?\($0)" } ?? ""
        return "\(url.path)\(query)"
    }
}
