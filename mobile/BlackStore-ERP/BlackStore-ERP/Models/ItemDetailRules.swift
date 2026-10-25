import Foundation

/// What the signed-in user may do on the device page; hidden, not disabled, when false.
nonisolated public struct ItemPermissions: Equatable, Sendable {
    public var canEdit = false        // condition, attributes, identifiers, system code
    public var canEditPrices = false
    public var canViewCost = false

    /// Statuses whose edits are past records (server LOCKED_STATUSES, FR-29).
    public static let lockedStatuses: Set<String> = ["DEBT", "SOLD", "RETURNED", "DEFECTIVE"]

    public init() {}

    /// Same rule as the server's loadForEdit: past records also need edit_past_records.
    public init(status: String, has: (String) -> Bool) {
        let unlocked = !Self.lockedStatuses.contains(status) || has("edit_past_records")
        canEdit = has("receive_batch") && unlocked
        canEditPrices = has("manage_prices") && unlocked
        canViewCost = has("view_cost")
    }
}

/// Attribute rules, the same as the server's validateAttributes (FR-3).
nonisolated public enum AttributeRules {
    /// Error for one typed value, or nil when it is valid. Empty optional values are fine.
    public static func error(_ raw: String, for def: CategoryAttribute) -> String? {
        let value = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        if value.isEmpty { return def.required ? "\(def.label) to'ldirilishi shart" : nil }
        switch def.type {
        case .number:
            return number(value) == nil ? "\(def.label) raqam bo'lishi kerak" : nil
        case .select:
            return (def.options ?? []).contains(value) ? nil : "\(def.label): ro'yxatdan tanlang"
        case .text:
            return value.count > 200 ? "Ko'pi bilan 200 ta belgi" : nil
        }
    }

    /// The replacement set to send: only defined keys, empty ones dropped, NUMBER as a number.
    public static func payload(_ drafts: [String: String], defs: [CategoryAttribute]) -> [String: AttributeValue] {
        var result: [String: AttributeValue] = [:]
        for def in defs {
            let value = (drafts[def.key] ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
            guard !value.isEmpty else { continue }
            if def.type == .number, let n = number(value) { result[def.key] = .number(n) }
            else { result[def.key] = .text(value) }
        }
        return result
    }

    /// Finite number from text, accepting a decimal comma.
    static func number(_ text: String) -> Double? {
        Double(text.replacingOccurrences(of: ",", with: ".")).flatMap { $0.isFinite ? $0 : nil }
    }

    /// Rows in category order (by sortOrder), then keys the category no longer defines.
    public static func rows(_ values: [String: AttributeValue], defs: [CategoryAttribute]) -> [(key: String, label: String, value: String)] {
        let sorted = defs.sorted { $0.sortOrder < $1.sortOrder }
        let known = sorted.compactMap { def in values[def.key].map { (def.key, def.label, $0.display) } }
        let keys = Set(sorted.map(\.key))
        let extra = values.filter { !keys.contains($0.key) }.sorted { $0.key < $1.key }.map { ($0.key, $0.key, $0.value.display) }
        return (known + extra).filter { !$0.2.isEmpty }.map { (key: $0.0, label: $0.1, value: $0.2) }
    }

    /// Edit sheet Save rule: a condition-only change needs no attribute checks (attributes are not
    /// sent then); changed attributes must all be valid.
    public static func canSave(conditionChanged: Bool, attributesChanged: Bool, hasErrors: Bool) -> Bool {
        (conditionChanged && !attributesChanged) || (attributesChanged && !hasErrors)
    }

    /// Spec summary like the web badges: processor, RAM, storage, colour, then the rest A–Z.
    public static func specSummary(_ values: [String: AttributeValue]) -> String {
        let weight = ["processor": 1, "cpu": 1, "ram": 2, "memory": 2, "storage": 3, "ssd": 3, "rom": 3,
                      "capacity": 3, "color": 4, "colour": 4]
        return values.map { (key: $0.key, value: $0.value.display.trimmingCharacters(in: .whitespaces)) }
            .filter { !$0.value.isEmpty }
            .sorted { (weight[$0.key.lowercased()] ?? 99, $0.key) < (weight[$1.key.lowercased()] ?? 99, $1.key) }
            .map(\.value)
            .joined(separator: " · ")
    }
}

/// Price rules, the same as the server's MONEY_REGEX and assertPriceOrder.
nonisolated public enum PriceRules {
    /// Trimmed text with a decimal comma turned into a dot.
    public static func normalize(_ text: String) -> String {
        text.trimmingCharacters(in: .whitespacesAndNewlines).replacingOccurrences(of: ",", with: ".")
    }

    /// Non-negative decimal string, up to 10 digits and 2 decimals (empty = not sent).
    public static func isMoney(_ text: String) -> Bool {
        normalize(text).range(of: #"^\d{1,10}(\.\d{1,2})?$"#, options: .regularExpression) != nil
    }

    /// Field error for one price box.
    public static func fieldError(_ text: String) -> String? {
        normalize(text).isEmpty || isMoney(text) ? nil : "Narxni to'g'ri kiriting (masalan 1250.50)"
    }

    /// min ≤ sale after the edit; an empty box keeps the current value, like the server.
    public static func orderError(sale: String, min: String, currentSale: String?, currentMin: String?) -> String? {
        let s = normalize(sale).isEmpty ? currentSale : normalize(sale)
        let m = normalize(min).isEmpty ? currentMin : normalize(min)
        guard let s, let m, let sd = Decimal(string: s), let md = Decimal(string: m) else { return nil }
        return md > sd ? "Minimal narx sotish narxidan yuqori bo'lishi mumkin emas" : nil
    }

    /// Only boxes that are filled and differ from the current value; nil when invalid.
    public static func payload(purchase: String?, sale: String, min: String,
                               current: (purchase: String?, sale: String?, min: String?)) -> UpdateItemPricesPayload? {
        let boxes = [purchase ?? "", sale, min]
        guard boxes.allSatisfy({ fieldError($0) == nil }),
              orderError(sale: sale, min: min, currentSale: current.sale, currentMin: current.min) == nil
        else { return nil }
        return UpdateItemPricesPayload(
            purchasePrice: purchase.flatMap { changed($0, current.purchase) },
            salePrice: changed(sale, current.sale),
            minSalePrice: changed(min, current.min)
        )
    }

    private static func changed(_ text: String, _ current: String?) -> String? {
        let value = normalize(text)
        guard !value.isEmpty else { return nil }
        if let current, Decimal(string: current) == Decimal(string: value) { return nil }
        return value
    }
}

/// Identifier rules, the same as the server's validateIdentifier and per-type caps (FR-2).
nonisolated public enum IdentifierRules {
    public static let caps = ["IMEI": 2, "SERIAL": 1, "SYSTEM_CODE": 1]

    /// Types the user may still add by hand (system code has its own button).
    public static func addableTypes(existing: [String]) -> [String] {
        ["IMEI", "SERIAL"].filter { t in existing.filter { $0 == t }.count < caps[t, default: 0] }
    }

    /// Error for a typed value, or nil when it is valid.
    public static func error(type: String, value raw: String) -> String? {
        let value = raw.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
        if value.isEmpty { return "Qiymatni kiriting" }
        if matches(value, #"^\d{15}.+$"#) { return "Ikki kod qo'shilib ketgan, qayta skanerlang" }
        if type == "IMEI" { return matches(value, #"^\d{15}$"#) ? nil : "IMEI aynan 15 ta raqamdan iborat bo'lishi kerak" }
        return matches(value, #"^[A-Z0-9-]{4,20}$"#) ? nil : "Seriya raqami 4–20 ta belgi: A–Z, 0–9 va -"
    }

    private static func matches(_ value: String, _ pattern: String) -> Bool {
        value.range(of: pattern, options: .regularExpression) != nil
    }
}

/// Label printing prints the shop's system code only (FR-15).
nonisolated public enum LabelRules {
    /// The shared `Item` reduced to its SYSTEM_CODE identifier, so `BarcodePrintSheet` can only
    /// pick that code; nil when the item has none. `Item` has no memberwise init, hence the JSON trip.
    public static func systemCodeItem(_ item: Item) -> Item? {
        guard item.identifiers.contains(where: { $0.type == "SYSTEM_CODE" }),
              let data = try? JSONEncoder().encode(item),
              var json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let ids = json["identifiers"] as? [[String: Any]]
        else { return nil }
        json["identifiers"] = ids.filter { $0["type"] as? String == "SYSTEM_CODE" }
        guard let filtered = try? JSONSerialization.data(withJSONObject: json) else { return nil }
        return try? JSONDecoder().decode(Item.self, from: filtered)
    }
}

/// What the "Yorliq chop etish" row does for this item and user.
nonisolated public enum LabelAction: Equatable, Sendable {
    case print, generateThenPrint, noSystemCode

    /// Print an existing system code; create it first only for users who may edit the item
    /// (receive_batch, unlocked); otherwise say there is no code instead of printing an IMEI label.
    public init(hasSystemCode: Bool, canGenerate: Bool) {
        self = hasSystemCode ? .print : (canGenerate ? .generateThenPrint : .noSystemCode)
    }
}
