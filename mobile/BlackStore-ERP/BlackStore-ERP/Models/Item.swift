import Foundation

/// Unique device identifier (IMEI, Serial number, or System Code).
nonisolated public struct ItemIdentifier: Codable, Identifiable, Sendable {
    public let id: Int
    public let type: String
    public let value: String
}

/// Category projection for an item model.
nonisolated public struct ItemCategory: Codable, Identifiable, Hashable, Sendable {
    public let id: Int
    public let name: String
}

/// Product model projection.
nonisolated public struct ProductModel: Codable, Identifiable, Hashable, Sendable {
    public let id: Int
    public let name: String
    public let category: ItemCategory?
}

/// Store or warehouse location.
nonisolated public struct ItemLocation: Codable, Identifiable, Sendable {
    public let id: Int
    public let name: String
}

/// Serialized device entity in BLACKSTORE inventory.
nonisolated public struct Item: Codable, Identifiable, Sendable {
    public let id: Int
    public let productModel: ProductModel
    public let location: ItemLocation?
    public let status: String
    public let condition: String
    public let salePrice: String?
    public let minSalePrice: String?
    public let identifiers: [ItemIdentifier]
    public let attributes: [String: String]?

    /// Primary display identifier (IMEI if present, else SERIAL, else SYSTEM_CODE).
    public var primaryIdentifier: String {
        if let imei = identifiers.first(where: { $0.type == "IMEI" }) {
            return "IMEI: \(imei.value)"
        }
        if let serial = identifiers.first(where: { $0.type == "SERIAL" }) {
            return "S/N: \(serial.value)"
        }
        if let first = identifiers.first {
            return "\(first.type): \(first.value)"
        }
        return "#\(id)"
    }
}

/// Paginated list of serialized items from GET /items.
nonisolated public struct ItemListResponse: Codable, Sendable {
    public let items: [Item]
    public let total: Int
    public let page: Int
    public let pageSize: Int
}
