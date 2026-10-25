import Foundation

/// Editable state of the attribute form plus the same validation rules as the web schema.
struct AttributeDraft: Equatable {
    var label: String
    var key: String
    var type: AttributeType
    var optionsText: String
    var required: Bool
    var sortOrderText: String
    /// True once the user typed a key different from the one derived from the label.
    private(set) var isKeyManual: Bool
    private let fallbackOrder: Int

    init(attribute: CategoryAttribute?, nextOrder: Int) {
        label = attribute?.label ?? ""
        key = attribute?.key ?? ""
        type = attribute?.type ?? .text
        optionsText = (attribute?.options ?? []).joined(separator: ", ")
        required = attribute?.required ?? false
        sortOrderText = String(attribute?.sortOrder ?? nextOrder)
        isKeyManual = attribute.map { $0.key != AttributeKey.slugify($0.label) } ?? false
        fallbackOrder = nextOrder
    }

    /// Changes the label and re-derives the key unless the user owns it.
    mutating func setLabel(_ value: String) {
        label = value
        if !isKeyManual { key = AttributeKey.slugify(value) }
    }

    /// Changes the key; an empty or derived key hands control back to the label.
    mutating func setKey(_ value: String) {
        key = value
        isKeyManual = !(value.isEmpty || value == AttributeKey.slugify(label))
    }

    private var trimmedKey: String { key.trimmingCharacters(in: .whitespaces) }
    private var trimmedLabel: String { label.trimmingCharacters(in: .whitespaces) }
    private var options: [String] {
        optionsText.split(separator: ",").map { $0.trimmingCharacters(in: .whitespaces) }.filter { !$0.isEmpty }
    }

    var labelError: String? {
        if trimmedLabel.isEmpty { return "Maydon nomini kiriting" }
        return trimmedLabel.count > 100 ? "Ko'pi bilan 100 ta belgi" : nil
    }

    var keyError: String? {
        if trimmedKey.isEmpty { return "Kalit so'zni kiriting" }
        if trimmedKey.count > 50 { return "Ko'pi bilan 50 ta belgi" }
        let valid = trimmedKey.range(of: "^[a-z][a-z0-9_]*$", options: .regularExpression) != nil
        return valid ? nil : "Kalit faqat lotin harflari va raqamlardan iborat bo'lishi kerak"
    }

    var optionsError: String? {
        guard type == .select else { return nil }
        if options.isEmpty { return "Tanlov turi uchun kamida bitta variant kiriting" }
        if options.count > 50 { return "Ko'pi bilan 50 ta variant kiritish mumkin" }
        return options.contains { $0.count > 50 } ? "Variant uzunligi 50 belgidan oshmasligi kerak" : nil
    }

    var orderError: String? {
        let isWholeNumber = sortOrderText.range(of: "^[0-9]+$", options: .regularExpression) != nil
        return sortOrderText.isEmpty || (isWholeNumber && Int32(sortOrderText) != nil)
            ? nil : "Tartib raqami 0 yoki undan katta butun son bo'lishi kerak"
    }

    var isValid: Bool { labelError == nil && keyError == nil && optionsError == nil && orderError == nil }

    /// API body; options only for SELECT, empty order falls back to the next free one.
    var payload: AttributePayload {
        AttributePayload(
            key: trimmedKey, label: trimmedLabel, type: type,
            options: type == .select ? options : nil, required: required,
            sortOrder: Int(sortOrderText) ?? fallbackOrder
        )
    }
}

/// Port of the web `slugifyAttributeKey`: label -> snake_case key, Cyrillic transliterated.
enum AttributeKey {
    private static let cyrillic: [Character: String] = [
        "а": "a", "б": "b", "в": "v", "г": "g", "д": "d", "е": "e", "ё": "yo", "ж": "zh",
        "з": "z", "и": "i", "й": "y", "к": "k", "л": "l", "м": "m", "н": "n", "о": "o",
        "п": "p", "р": "r", "с": "s", "т": "t", "у": "u", "ф": "f", "х": "kh", "ц": "ts",
        "ч": "ch", "ш": "sh", "щ": "shch", "ъ": "", "ы": "y", "ь": "", "э": "e", "ю": "yu",
        "я": "ya", "є": "ye", "і": "i", "ї": "yi", "ґ": "g",
    ]
    private static let quotes: Set<Character> = ["'", "\u{2019}", "\u{2018}", "\u{02BB}", "`", "\""]

    /// Starts with a-z, only a-z0-9_, at most 50 characters.
    static func slugify(_ title: String) -> String {
        var text = title.lowercased()
            .map { cyrillic[$0] ?? String($0) }
            .joined()
        text.removeAll { quotes.contains($0) }
        text = text.replacingOccurrences(of: "[^a-z0-9]+", with: "_", options: .regularExpression)
            .replacingOccurrences(of: "^[^a-z]+", with: "", options: .regularExpression)
        return String(text.prefix(50)).replacingOccurrences(of: "_+$", with: "", options: .regularExpression)
    }
}
