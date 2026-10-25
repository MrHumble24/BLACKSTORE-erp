import SwiftUI

/// Detailed inspector view for a single HTTP network transaction.
public struct NetworkLogDetailView: View {
    public let entry: NetworkLogEntry
    @State private var isCopied: Bool = false

    public init(entry: NetworkLogEntry) {
        self.entry = entry
    }

    public var body: some View {
        List {
            Section("So'rov umumiy ma'lumotlari") {
                LabeledContent("Method", value: entry.method)
                LabeledContent("Status", value: entry.statusBadgeText)
                LabeledContent("Duration", value: entry.formattedDuration)
                LabeledContent("Vaqt", value: entry.timestamp.formatted(date: .omitted, time: .standard))
                LabeledContent("URL", value: entry.url)
            }

            if let err = entry.errorMessage {
                Section("Xatolik") {
                    Text(err)
                        .font(.caption)
                        .foregroundStyle(.red)
                }
            }

            if let reqBody = entry.requestBody, !reqBody.isEmpty {
                Section("Request Body") {
                    Text(reqBody)
                        .font(.system(.caption, design: .monospaced))
                }
            }

            if let resBody = entry.responseBody, !resBody.isEmpty {
                Section("Response Body") {
                    Text(resBody)
                        .font(.system(.caption, design: .monospaced))
                }
            }

            Section {
                Button {
                    copyToClipboard(curlCommand)
                } label: {
                    Label(isCopied ? "Nusxa olindi!" : "cURL sifatida nusxa olish", systemImage: "doc.on.doc")
                }
            }
        }
        .navigationTitle("\(entry.method) \(entry.statusBadgeText)")
        .navigationBarTitleDisplayMode(.inline)
    }

    private var curlCommand: String {
        var curl = "curl -X \(entry.method) '\(entry.url)'"
        if let headers = entry.requestHeaders {
            for (k, v) in headers {
                curl += " -H '\(k): \(v)'"
            }
        }
        if let body = entry.requestBody {
            curl += " -d '\(body)'"
        }
        return curl
    }

    private func copyToClipboard(_ text: String) {
        UIPasteboard.general.string = text
        isCopied = true
        HapticManager.selection()
        Task {
            try? await Task.sleep(nanoseconds: 2_000_000_000)
            isCopied = false
        }
    }
}
