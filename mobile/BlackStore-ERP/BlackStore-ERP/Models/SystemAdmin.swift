import Foundation

/// User attribution inside an audit record.
public struct AuditLogUser: Codable {
    public let id: Int
    public let name: String
}

/// Audit trail event record (FR-30).
public struct AuditLogItem: Codable, Identifiable {
    public let id: Int
    public let createdAt: String
    public let action: String
    public let entity: String
    public let entityId: Int
    public let user: AuditLogUser?
}

/// Paginated audit logs response.
public struct AuditLogResponse: Codable {
    public let items: [AuditLogItem]
    public let total: Int
    public let page: Int
    public let pageSize: Int
}

/// Database backup record (FR-31).
public struct BackupItem: Codable, Identifiable {
    public var id: String { fileName }
    public let fileName: String
    public let size: Int
    public let createdAt: String
    public let sentToTelegram: Bool
    public let secondCopy: Bool

    public var sizeFormatted: String {
        let kb = Double(size) / 1024.0
        if kb > 1024 {
            return String(format: "%.1f MB", kb / 1024.0)
        }
        return String(format: "%.0f KB", kb)
    }
}
