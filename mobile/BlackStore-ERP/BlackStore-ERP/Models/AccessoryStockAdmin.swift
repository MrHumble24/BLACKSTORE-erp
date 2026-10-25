import Foundation

/// Id and name of a related record (model category, location) in an accessory stock row.
nonisolated struct AccessoryRef: Codable, Hashable, Sendable {
    let id: Int
    let name: String
}

/// Product model of an accessory stock row, with its category.
nonisolated struct AccessoryRowModel: Codable, Hashable, Sendable {
    let id: Int
    let name: String
    let category: AccessoryRef
}

/// One (model, location) row of GET /accessory-stock; `avgCost` is sent only with view_cost.
nonisolated struct AccessoryStockRow: Codable, Identifiable, Hashable, Sendable {
    let id: Int
    let quantity: Int
    let avgCost: String?
    let lowStockThreshold: Int?
    let productModel: AccessoryRowModel
    let location: AccessoryRef

    /// Out, low or normal, by the server's rule.
    var level: AccessoryStockLevel {
        AccessoryStockRules.level(quantity: quantity, threshold: lowStockThreshold)
    }
}

/// Paginated body of GET /accessory-stock.
nonisolated struct AccessoryStockPage: Codable, Sendable {
    let items: [AccessoryStockRow]
    let total: Int
    let page: Int
    let pageSize: Int
}

/// Stock state of one row, drives the row's mark.
nonisolated enum AccessoryStockLevel: Equatable, Sendable {
    case out, low, normal
}

/// Stock-level filter accepted by GET /accessory-stock (`stockLevel`).
nonisolated enum AccessoryStockLevelFilter: String, CaseIterable, Identifiable, Sendable {
    case all = "ALL", inStock = "IN_STOCK", lowStock = "LOW_STOCK", outOfStock = "OUT_OF_STOCK"

    var id: String { rawValue }

    /// Uzbek label from the web (accessories.stockFilter*).
    var label: String {
        switch self {
        case .all: return "Barcha qoldiqlar"
        case .inStock: return "Mavjud"
        case .lowStock: return "Kam qolgan"
        case .outOfStock: return "Tugagan (0)"
        }
    }
}

/// List filters; kept across reloads so a save never resets what the user picked.
nonisolated struct AccessoryStockFilters: Equatable, Sendable {
    var locationId: Int?
    var categoryId: Int?
    var level: AccessoryStockLevelFilter = .all

    var isActive: Bool { locationId != nil || categoryId != nil || level != .all }

    /// GET path for one page with these filters (ALL is the server default, so it is left out).
    func path(page: Int, pageSize: Int) -> String {
        var query = ["page=\(page)", "pageSize=\(pageSize)"]
        if let locationId { query.append("locationId=\(locationId)") }
        if let categoryId { query.append("categoryId=\(categoryId)") }
        if level != .all { query.append("stockLevel=\(level.rawValue)") }
        return "/accessory-stock?" + query.joined(separator: "&")
    }
}

/// Body of POST /accessory-stock; `unitCost` is left out unless the user may set it.
nonisolated struct AddAccessoryStockBody: Encodable, Sendable {
    let productModelId: Int
    let locationId: Int
    let quantity: Int
    let unitCost: String?
}

/// Pure validation and stock rules, matching the server DTOs and `low-stock.ts`.
nonisolated enum AccessoryStockRules {
    /// Server cap on one receipt (CreateAccessoryStockDto @Max).
    static let maxQuantity = 100_000

    /// Low when there is stock left at or under the model's threshold; 0 or nil means no alert.
    static func level(quantity: Int, threshold: Int?) -> AccessoryStockLevel {
        if quantity <= 0 { return .out }
        if let threshold, quantity <= threshold { return .low }
        return .normal
    }

    /// Whole number 1...100 000, or nil.
    static func quantity(_ text: String) -> Int? {
        let trimmed = text.trimmingCharacters(in: .whitespaces)
        guard trimmed.allSatisfy(\.isASCII), let value = Int(trimmed), (1...maxQuantity).contains(value) else { return nil }
        return value
    }

    /// Unit cost as the server's money string: empty means "not given" (.some(nil)); invalid is nil.
    /// Mirrors MONEY_REGEX `^\d{1,10}(\.\d{1,2})?$` (the field's decimalCommaFix already turns "," into ".").
    static func unitCost(_ text: String) -> String?? {
        let value = text.trimmingCharacters(in: .whitespaces)
        if value.isEmpty { return .some(nil) }
        let isMoney = value.range(of: "^[0-9]{1,10}(\\.[0-9]{1,2})?$", options: .regularExpression) != nil
        return isMoney ? .some(value) : nil
    }

    /// Low-stock threshold for a new model: empty means no alert (.some(nil)), else a whole number ≥ 1; invalid is nil.
    static func threshold(_ text: String) -> Int?? {
        let value = text.trimmingCharacters(in: .whitespaces)
        if value.isEmpty { return .some(nil) }
        guard value.allSatisfy(\.isASCII), let number = Int32(value), number >= 1 else { return nil }
        return .some(Int(number))
    }

    /// Model name error, or nil when it is fine (required, ≤ 100 characters like the DTO).
    static func nameError(_ name: String) -> String? {
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmed.isEmpty { return "Model nomini kiriting" }
        return trimmed.utf16.count > 100 ? "Ko'pi bilan 100 ta belgi" : nil
    }
}
