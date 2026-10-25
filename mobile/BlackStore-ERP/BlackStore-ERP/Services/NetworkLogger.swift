import Foundation
import Combine

/// Network log entry model capturing HTTP request/response metrics.
public struct NetworkLogEntry: Identifiable, Sendable {
    public let id: UUID
    public let timestamp: Date
    public let method: String
    public let url: String
    public var statusCode: Int?
    public var duration: TimeInterval?
    public let requestHeaders: [String: String]?
    public let requestBody: String?
    public var responseBody: String?
    public var errorMessage: String?

    public var isSuccess: Bool {
        guard let code = statusCode else { return false }
        return (200...299).contains(code) && errorMessage == nil
    }

    public var statusBadgeText: String {
        if let code = statusCode {
            return "\(code)"
        }
        return "ERR"
    }

    public var formattedDuration: String {
        guard let d = duration else { return "—" }
        return String(format: "%.0f ms", d * 1000)
    }
}

/// In-memory ring buffer capturing HTTP calls for developer inspection.
@MainActor
public final class NetworkLogger: ObservableObject {
    public static let shared = NetworkLogger()

    @Published public private(set) var entries: [NetworkLogEntry] = []
    private let maxEntries = 100

    private init() {}

    /// Logs an outgoing request and returns a tracking UUID.
    public func logRequest(method: String, url: String, headers: [String: String]?, body: Data?) -> UUID {
        let id = UUID()
        // Never keep login credentials in the log.
        let bodyString = url.contains("/auth/login") ? nil : body.flatMap { String(data: $0, encoding: .utf8) }
        let entry = NetworkLogEntry(
            id: id,
            timestamp: Date(),
            method: method,
            url: url,
            statusCode: nil,
            duration: nil,
            requestHeaders: headers.map(Self.maskSecrets),
            requestBody: bodyString,
            responseBody: nil,
            errorMessage: nil
        )

        entries.insert(entry, at: 0)
        if entries.count > maxEntries {
            entries.removeLast()
        }
        return id
    }

    /// Updates the log entry with HTTP response data.
    public func logResponse(id: UUID, statusCode: Int, body: Data?, duration: TimeInterval) {
        guard let idx = entries.firstIndex(where: { $0.id == id }) else { return }
        entries[idx].statusCode = statusCode
        entries[idx].duration = duration
        // The login response carries tokens, so it is not stored either.
        if let body = body, !entries[idx].url.contains("/auth/login") {
            entries[idx].responseBody = formatJSON(data: body)
        }
    }

    /// Updates the log entry with an error without overwriting valid HTTP status codes.
    public func logError(id: UUID, error: Error, statusCode: Int?, duration: TimeInterval) {
        guard let idx = entries.firstIndex(where: { $0.id == id }) else { return }
        if let code = statusCode {
            entries[idx].statusCode = code
        }
        entries[idx].duration = duration
        entries[idx].errorMessage = error.localizedDescription
    }

    /// Replaces Authorization and Cookie header values with "<hidden>".
    private static func maskSecrets(_ headers: [String: String]) -> [String: String] {
        let secret: Set<String> = ["authorization", "cookie"]
        return headers.reduce(into: [:]) { result, pair in
            result[pair.key] = secret.contains(pair.key.lowercased()) ? "<hidden>" : pair.value
        }
    }

    /// Clears all recorded entries.
    public func clear() {
        entries.removeAll()
    }

    private func formatJSON(data: Data) -> String {
        if let jsonObject = try? JSONSerialization.jsonObject(with: data),
           let prettyData = try? JSONSerialization.data(withJSONObject: jsonObject, options: .prettyPrinted),
           let prettyString = String(data: prettyData, encoding: .utf8) {
            return prettyString
        }
        return String(data: data, encoding: .utf8) ?? "<Binary or invalid string>"
    }
}
