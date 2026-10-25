import Foundation

/// Scan classification status in a physical stock count (PRD FR-6, W7).
nonisolated public enum StockScanStatus: String, Codable, Sendable {
    case found = "FOUND"
    case unknown = "UNKNOWN"
    case wrongLocation = "WRONG_LOCATION"
    case duplicate = "DUPLICATE"

    public var title: String {
        switch self {
        case .found: return "Mavjud (Topildi)"
        case .unknown: return "Noma'lum kod"
        case .wrongLocation: return "Boshqa filialda"
        case .duplicate: return "Qayta skanerlandi"
        }
    }
}

/// Brief item projection in stock count discrepancies.
nonisolated public struct StockCountItemBrief: Codable, Identifiable, Sendable {
    public let id: Int
    public let status: String
    public let productModel: ProductModel
    public let location: ItemLocation
    public let identifiers: [ItemIdentifier]
}

/// Unregistered scan code captured during stock audit.
nonisolated public struct UnknownScan: Codable, Sendable {
    public let code: String
    public let scannedAt: String
}

/// Discrepancy comparison result against system expected stock.
nonisolated public struct StockCountResult: Codable, Sendable {
    public let expectedCount: Int
    public let found: Int
    public let missing: [StockCountItemBrief]
    public let wrongLocation: [StockCountItemBrief]
    public let unknown: [UnknownScan]
}

/// Active or completed physical stock count session.
nonisolated public struct StockCount: Codable, Identifiable, Sendable {
    public let id: Int
    public let startedAt: String
    public let finishedAt: String?
    public let location: ItemLocation
    public let result: StockCountResult?

    public var isFinished: Bool {
        finishedAt != nil
    }
}

/// Summary projection for paginated stock counts list.
nonisolated public struct StockCountSummary: Codable, Identifiable, Sendable {
    public let id: Int
    public let startedAt: String?
    public let finishedAt: String?
    public let location: ItemLocation?
    public let scannedCount: Int?

    public var isFinished: Bool {
        finishedAt != nil
    }
}

/// Paginated stock count list container.
nonisolated public struct StockCountListResponse: Codable, Sendable {
    public let items: [StockCountSummary]
    public let total: Int
}

/// Result returned by POST /stock-counts/:id/scans.
nonisolated public struct StockCountScanResponse: Codable, Sendable {
    public let code: String
    public let status: StockScanStatus
    public let scannedAt: String?
}

/// Request payload to start a stock count session.
nonisolated public struct CreateStockCountPayload: Encodable, Sendable {
    public let locationId: Int

    public init(locationId: Int) {
        self.locationId = locationId
    }
}
