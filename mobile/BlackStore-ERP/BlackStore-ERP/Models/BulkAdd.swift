import Foundation

/// Device condition choices (server `ItemCondition`) with the web's Uzbek labels.
nonisolated enum BulkCondition: String, CaseIterable, Identifiable, Sendable {
    case new = "NEW", used = "USED", refurbished = "REFURBISHED"

    var id: String { rawValue }
    var label: String {
        switch self {
        case .new: "Yangi"
        case .used: "Ishlatilgan (b/u)"
        case .refurbished: "Qayta tiklangan (ref)"
        }
    }
}

/// What the user may send: price fields need manage_prices, purchase price also view_cost.
nonisolated struct BulkAddAccess: Sendable {
    let canManagePrices: Bool
    let canViewCost: Bool
    var canSendPurchasePrice: Bool { canManagePrices && canViewCost }
}

/// One attribute value as JSON: numbers for NUMBER attributes, strings otherwise.
nonisolated enum BulkAttributeValue: Encodable, Equatable, Sendable {
    case text(String), number(Double)

    func encode(to encoder: Encoder) throws {
        var c = encoder.singleValueContainer()
        switch self {
        case .text(let value): try c.encode(value)
        case .number(let value): try c.encode(value)
        }
    }
}

/// One identifier in the POST /items body.
nonisolated struct BulkIdentifierBody: Encodable, Equatable, Sendable {
    let type: BulkCodeKind
    let value: String
}

/// Body of POST /items for one device; nil fields are left out of the JSON.
nonisolated struct BulkItemBody: Encodable, Sendable {
    let productModelId: Int
    let investorId: Int
    let locationId: Int
    let condition: String
    let attributes: [String: BulkAttributeValue]?
    let identifiers: [BulkIdentifierBody]
    let purchasePrice: String?
    let salePrice: String?
    let minSalePrice: String?
}

/// The one-time settings shared by every device in the list, with their checks.
nonisolated struct BulkAddSettings: Equatable, Sendable {
    var categoryId: Int?
    var modelId: Int?
    var investorId: Int?
    var locationId: Int?
    var condition: BulkCondition = .new
    /// Typed or picked attribute values by attribute key.
    var attributes: [String: String] = [:]
    var purchasePrice = ""
    var salePrice = ""
    var minSalePrice = ""

    /// A typed number (fields turn "," into "." as you type), or nil when empty, invalid or infinite.
    static func number(_ text: String) -> Double? {
        Double(text.trimmingCharacters(in: .whitespaces)).flatMap { $0.isFinite ? $0 : nil }
    }

    /// Money as the server wants it: up to 10 digits and 2 decimals.
    static func money(_ text: String) -> String? {
        let value = text.trimmingCharacters(in: .whitespaces)
        return value.wholeMatch(of: #/\d{1,10}(\.\d{1,2})?/#) != nil ? value : nil
    }

    /// The first thing the user still has to fix, in Uzbek, or nil when settings are ready.
    func problem(attributes defs: [CategoryAttribute], access: BulkAddAccess) -> String? {
        if categoryId == nil { return "Kategoriyani tanlang" }
        if modelId == nil { return "Modelni tanlang" }
        if investorId == nil { return "Mulkdorni (investorni) tanlang" }
        if locationId == nil { return "Filial yoki omborni tanlang" }
        for def in defs {
            let value = trimmed(attributes[def.key])
            if value.isEmpty {
                if def.required { return "\(def.label) to'ldirilishi shart" }
            } else if def.type == .number, Self.number(value) == nil {
                return "\(def.label) raqam bo'lishi kerak"
            }
        }
        return priceProblem(access: access)
    }

    /// Filled prices must be valid money and the minimum must not exceed the sale price.
    private func priceProblem(access: BulkAddAccess) -> String? {
        guard access.canManagePrices else { return nil }
        let fields = access.canViewCost ? [purchasePrice, salePrice, minSalePrice] : [salePrice, minSalePrice]
        if fields.contains(where: { !trimmed($0).isEmpty && Self.money($0) == nil }) { return "Noto'g'ri narx" }
        if let sale = Self.money(salePrice).flatMap(Self.number), let min = Self.money(minSalePrice).flatMap(Self.number),
           min > sale {
            return "Minimal narx sotish narxidan yuqori bo'lishi mumkin emas"
        }
        return nil
    }

    /// The POST /items body for one device (all its codes together); call only when `problem` is nil.
    func body(for device: BulkDevice, attributes defs: [CategoryAttribute], access: BulkAddAccess) -> BulkItemBody? {
        guard let modelId, let investorId, let locationId else { return nil }
        let attrs = attributeValues(defs)
        let price = { (text: String, allowed: Bool) in allowed ? Self.money(text) : nil }
        return BulkItemBody(
            productModelId: modelId, investorId: investorId, locationId: locationId,
            condition: condition.rawValue,
            attributes: attrs.isEmpty ? nil : attrs,
            identifiers: device.codes.map { BulkIdentifierBody(type: $0.kind, value: $0.value) },
            // Cost never leaves the phone without manage_prices + view_cost.
            purchasePrice: price(purchasePrice, access.canSendPurchasePrice),
            salePrice: price(salePrice, access.canManagePrices),
            minSalePrice: price(minSalePrice, access.canManagePrices)
        )
    }

    /// Filled attributes of the category only, NUMBER ones as numbers (server checks the type).
    private func attributeValues(_ defs: [CategoryAttribute]) -> [String: BulkAttributeValue] {
        var result: [String: BulkAttributeValue] = [:]
        for def in defs {
            let value = trimmed(attributes[def.key])
            guard !value.isEmpty else { continue }
            if def.type != .number { result[def.key] = .text(value) } else if let n = Self.number(value) { result[def.key] = .number(n) }
        }
        return result
    }

    private func trimmed(_ text: String?) -> String { (text ?? "").trimmingCharacters(in: .whitespacesAndNewlines) }
}

/// Result of sending one device.
nonisolated struct BulkAddOutcome: Identifiable, Sendable {
    enum Status: Sendable { case added, failed(String) }
    let device: BulkDevice
    let status: Status
    var id: String { device.id }
    var isAdded: Bool { if case .added = status { return true } else { return false } }
}

/// Turns a failed POST into a short Uzbek message for the result list.
nonisolated enum BulkAddFailure {
    /// 409 = code already on another device; 401/403 = no access; nil = no connection.
    static func message(statusCode: Int?, serverText: String) -> String {
        switch statusCode {
        case 409:
            let owner = serverText.firstMatch(of: #/#(\d+)/#).map { " (qurilma #\($0.1))" } ?? ""
            return "Ushbu identifikator boshqa qurilmaga biriktirilgan\(owner)"
        case 401: return "Sessiya tugagan. Qaytadan kiring."
        case 403: return "Bu amal uchun ruxsatingiz yo'q"
        case nil: return "Server bilan aloqa yo'q. Internetni tekshiring."
        default: return serverText
        }
    }

    /// After these every next request would fail the same way (offline, logged out, no access), so sending stops.
    static func stopsRun(_ statusCode: Int?) -> Bool { statusCode == nil || statusCode == 401 || statusCode == 403 }

    /// Message for the devices left unsent after a stop.
    static func notSent(_ reason: String) -> String { "Yuborilmadi: \(reason)" }
}
