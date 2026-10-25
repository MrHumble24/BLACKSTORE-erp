import Foundation

/// One attribute value as the server stores it: text, or a number for NUMBER attributes.
nonisolated public enum AttributeValue: Codable, Hashable, Sendable {
    case text(String)
    case number(Double)

    public init(from decoder: Decoder) throws {
        let c = try decoder.singleValueContainer()
        if let n = try? c.decode(Double.self) { self = .number(n) }
        else if let s = try? c.decode(String.self) { self = .text(s) }
        else { self = .text((try? c.decode(Bool.self)).map(String.init) ?? "") }
    }

    public func encode(to encoder: Encoder) throws {
        var c = encoder.singleValueContainer()
        switch self {
        case .text(let s): try c.encode(s)
        case .number(let n): try c.encode(n)
        }
    }

    /// Display text; whole numbers lose their ".0".
    public var display: String {
        switch self {
        case .text(let s): return s
        case .number(let n):
            return n == n.rounded() && abs(n) < 1e15 ? String(Int64(n)) : String(n)
        }
    }
}

/// Investor brief on the item response.
nonisolated public struct ItemOwner: Decodable, Sendable {
    public let id: Int
    public let name: String
    public let code: String
}

/// Location brief with its kind (WAREHOUSE / SHOP).
nonisolated public struct ItemPlace: Decodable, Sendable {
    public let id: Int
    public let name: String
    public let type: String
}

/// GET /items/:id as the server sends it; cost keys exist only with view_cost.
nonisolated public struct ItemDetail: Decodable, Identifiable, Sendable {
    public let id: Int
    public let productModel: ProductModel
    public let investor: ItemOwner
    public let location: ItemPlace
    public let status: String
    public let condition: String
    /// Raw JSON column; read through `attributeValues`.
    public let attributes: [String: AttributeValue]?
    public let salePrice: String?
    public let minSalePrice: String?
    public let identifiers: [ItemIdentifier]
    public let purchasePrice: String?
    public let cost: String?
    public let createdAt: String
    public let updatedAt: String

    /// Attribute values, empty when the column is null.
    public var attributeValues: [String: AttributeValue] { attributes ?? [:] }
    public var hasSystemCode: Bool { identifiers.contains { $0.type == "SYSTEM_CODE" } }
}

/// The item response decoded twice from one body: the full detail, plus the shared `Item` the label sheet takes.
nonisolated public struct ItemDetailEnvelope: Decodable, Sendable {
    public let detail: ItemDetail
    public let labelItem: Item

    public init(from decoder: Decoder) throws {
        detail = try ItemDetail(from: decoder)
        labelItem = try Item(from: decoder)
    }
}

/// One row of GET /transfers?itemId= (date, from → to, who).
nonisolated public struct ItemTransfer: Decodable, Identifiable, Sendable {
    /// User brief on a transfer.
    public struct Mover: Decodable, Sendable { public let name: String }
    public let id: Int
    public let date: String
    public let fromLocation: ItemLocation
    public let toLocation: ItemLocation
    public let user: Mover
}

/// Paginated transfers page; only `items` is used.
nonisolated public struct ItemTransferPage: Decodable, Sendable { public let items: [ItemTransfer] }

/// Body of PATCH /items/:id; attributes are the full replacement set, left out when not edited.
nonisolated public struct UpdateItemDetailPayload: Encodable, Sendable {
    public let condition: String
    public let attributes: [String: AttributeValue]?
}

/// Body of PATCH /items/:id/prices; nil prices are left out (unchanged on the server).
nonisolated public struct UpdateItemPricesPayload: Encodable, Equatable, Sendable {
    public var purchasePrice: String? = nil
    public var salePrice: String? = nil
    public var minSalePrice: String? = nil
    public var isEmpty: Bool { purchasePrice == nil && salePrice == nil && minSalePrice == nil }
}

/// Body of POST /items/:id/identifiers.
nonisolated public struct AddIdentifierPayload: Encodable, Sendable {
    public let type: String
    public let value: String
}

/// Uzbek labels for status, condition, location type and identifier type (web uz.json).
nonisolated public enum ItemText {
    public static let conditions = ["NEW", "USED", "REFURBISHED"]

    public static func status(_ s: String) -> String {
        ["IN_STOCK": "Mavjud", "AT_PARTNER": "Hamkorda", "DEBT": "Nasiyada", "SOLD": "Sotilgan",
         "RETURNED": "Qaytarilgan", "DEFECTIVE": "Yaroqsiz (brak)"][s] ?? s
    }

    public static func condition(_ c: String) -> String {
        ["NEW": "Yangi", "USED": "Ishlatilgan (b/u)", "REFURBISHED": "Qayta tiklangan (ref)"][c] ?? c
    }

    public static func placeType(_ t: String) -> String {
        ["WAREHOUSE": "Ombor", "SHOP": "Do'kon"][t] ?? t
    }

    public static func identifierType(_ t: String) -> String {
        ["SYSTEM_CODE": "Tizim kodi", "SERIAL": "Seriya raqami"][t] ?? t
    }
}
