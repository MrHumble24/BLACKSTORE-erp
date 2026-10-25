import Foundation

/// Bulk add codes: IMEI / serial detection, grouping into devices, camera collection.

/// Identifier type of a bulk-added code, decided from its shape (server `IdentifierType`).
nonisolated enum BulkCodeKind: String, Encodable, Sendable {
    case imei = "IMEI", serial = "SERIAL"

    /// Short label shown next to the code.
    var label: String { self == .imei ? "IMEI" : "Seriya raqami" }
}

/// How many codes each device has, picked once for the whole list; the raw value is the label.
nonisolated enum BulkCodeLayout: String, CaseIterable, Identifiable, Sendable {
    case imei = "IMEI", twoImei = "IMEI + IMEI2", imeiSerial = "IMEI + seriya"

    var id: String { rawValue }
    /// Kinds each device needs, IMEI first (the server allows 2 IMEI + 1 serial).
    var kinds: [BulkCodeKind] {
        switch self {
        case .imei: [.imei]
        case .twoImei: [.imei, .imei]
        case .imeiSerial: [.imei, .serial]
        }
    }
    /// What to type on each line, for the section footer.
    var hint: String {
        switch self {
        case .imei: "Har qatorga bitta IMEI. Vergul yoki bo'sh joy bilan ajratish ham mumkin."
        case .twoImei: "Har qatorga bitta qurilma: IMEI 1 va IMEI 2, orasida bo'sh joy."
        case .imeiSerial: "Har qatorga bitta qurilma: IMEI va seriya raqami, orasida bo'sh joy."
        }
    }
    fileprivate var kindMismatch: String {
        switch self {
        case .imei: "IMEI aynan 15 ta raqamdan iborat bo'lishi kerak"
        case .twoImei: "Ikkala kod ham IMEI (15 ta raqam) bo'lishi kerak"
        case .imeiSerial: "Bitta IMEI va bitta seriya raqami kerak"
        }
    }
}

/// One code that passed the format checks.
nonisolated struct BulkCode: Hashable, Identifiable, Sendable {
    let value: String
    let kind: BulkCodeKind
    var id: String { value }
}

/// One device to add: its codes, IMEI first.
nonisolated struct BulkDevice: Hashable, Identifiable, Sendable {
    let codes: [BulkCode]
    var id: String { text }
    /// Codes as one text line, the way they are typed.
    var text: String { codes.map(\.value).joined(separator: " ") }

    /// Keeps IMEIs first in their typed order, then the serial.
    fileprivate init(_ codes: [BulkCode]) { self.codes = codes.filter { $0.kind == .imei } + codes.filter { $0.kind == .serial } }
}

/// A code or line that will not be sent, with the reason in Uzbek.
nonisolated struct BulkRejectedCode: Error, Hashable, Identifiable {
    let value: String
    let reason: String
    var id: String { value }
}

/// The pasted text after grouping into devices, cleaning, de-duplicating and checking.
nonisolated struct BulkCodeList: Equatable, Sendable {
    var valid: [BulkDevice] = []
    var rejected: [BulkRejectedCode] = []
    /// Repeated devices that were dropped (each device is added once).
    var duplicateCount = 0
    var codeCount: Int { valid.reduce(0) { $0 + $1.codes.count } }
}

/// Pure parsing and checking of pasted or scanned IMEI / serial codes (same rules as the server).
nonisolated enum BulkCodeParser {
    private static let separators = CharacterSet.whitespacesAndNewlines.union(CharacterSet(charactersIn: ",;"))

    /// Splits on new lines, commas, semicolons and spaces; trims, upper-cases, drops empties.
    static func tokens(_ text: String) -> [String] {
        text.components(separatedBy: separators).map { $0.uppercased() }.filter { !$0.isEmpty }
    }

    /// One code per device: every code is a device. Otherwise one device per line.
    static func groups(_ text: String, layout: BulkCodeLayout) -> [[String]] {
        if layout.kinds.count == 1 { return tokens(text).map { [$0] } }
        return text.components(separatedBy: .newlines).map(tokens).filter { !$0.isEmpty }
    }

    /// Checks every device once in order; repeats are counted, a code reused by another device is rejected.
    static func parse(_ text: String, layout: BulkCodeLayout) -> BulkCodeList {
        var list = BulkCodeList()
        var seenDevices = Set<[String]>()
        var seenCodes = Set<String>()
        for group in groups(text, layout: layout) {
            guard seenDevices.insert(group.sorted()).inserted else {
                list.duplicateCount += 1
                continue
            }
            switch device(group, layout: layout) {
            case .failure(let reject): list.rejected.append(reject)
            case .success(let device):
                if let taken = device.codes.first(where: { seenCodes.contains($0.value) }) {
                    list.rejected.append(BulkRejectedCode(value: device.text, reason: "\(taken.value) yuqoridagi qurilmada bor"))
                } else {
                    seenCodes.formUnion(device.codes.map(\.value))
                    list.valid.append(device)
                }
            }
        }
        return list
    }

    /// One device's codes: right count, each code's format, the kinds the layout needs (any order).
    static func device(_ group: [String], layout: BulkCodeLayout) -> Result<BulkDevice, BulkRejectedCode> {
        let needed = layout.kinds.count
        let fail = { (reason: String) in Result<BulkDevice, BulkRejectedCode>.failure(.init(value: group.joined(separator: " "), reason: reason)) }
        guard group.count == needed else { return fail("Har qatorda \(needed) ta kod bo'lishi kerak, bu yerda \(group.count) ta") }
        guard Set(group).count == needed else { return fail("IMEI 2 IMEI 1 dan farq qilishi kerak") }
        var codes: [BulkCode] = []
        for raw in group {
            switch classify(raw) {
            case .success(let code): codes.append(code)
            case .failure(let reject): return fail(needed == 1 ? reject.reason : "\(reject.value): \(reject.reason)")
            }
        }
        let device = BulkDevice(codes)
        return device.codes.map(\.kind) == layout.kinds ? .success(device) : fail(layout.kindMismatch)
    }

    /// Decides IMEI vs serial for one code, or why it cannot be used.
    static func classify(_ raw: String) -> Result<BulkCode, BulkRejectedCode> {
        let code = raw.trimmingCharacters(in: separators).uppercased()
        let reject = { (reason: String) in Result<BulkCode, BulkRejectedCode>.failure(BulkRejectedCode(value: code, reason: reason)) }
        if code.wholeMatch(of: #/\d{15}/#) != nil { return .success(BulkCode(value: code, kind: .imei)) }
        // 15 digits plus more: the scanner glued two codes together (server rejects these too).
        if code.wholeMatch(of: #/\d{15}.+/#) != nil { return reject("Ikki kod qo'shilib ketgan, alohida kiriting") }
        // 12–14 digits is almost always an IMEI with a digit missing, not a serial.
        if code.wholeMatch(of: #/\d{12,14}/#) != nil { return reject("IMEI aynan 15 ta raqamdan iborat bo'lishi kerak") }
        if code.wholeMatch(of: #/[A-Z0-9-]{4,20}/#) != nil { return .success(BulkCode(value: code, kind: .serial)) }
        return reject("Seriya raqami 4 tadan 20 tagacha harf, raqam yoki «-» bo'lishi kerak")
    }
}

/// Camera scanning: gathers codes into one device (any order of kinds) and closes it every N scans.
nonisolated struct BulkScanCollector: Sendable {
    enum Step: Equatable { case rejected(String), partial(next: BulkCodeKind), completed(BulkDevice) }
    private(set) var pending: [BulkCode] = []

    /// Adds one checked code; `listed` holds codes already in the text.
    mutating func add(_ code: BulkCode, layout: BulkCodeLayout, listed: Set<String>) -> Step {
        if listed.contains(code.value) || pending.contains(code) { return .rejected("Bu kod ro'yxatda bor") }
        var remaining = layout.kinds
        for kind in pending.map(\.kind) { remaining.remove(at: remaining.firstIndex(of: kind) ?? 0) }
        guard remaining.contains(code.kind) else {
            return .rejected(remaining.first == .serial ? "Endi seriya raqamini skanerlang" : "Endi IMEI ni skanerlang")
        }
        pending.append(code)
        remaining.remove(at: remaining.firstIndex(of: code.kind) ?? 0)
        guard let next = remaining.first else {
            defer { pending = [] }
            return .completed(BulkDevice(pending))
        }
        return .partial(next: next)
    }

    /// Drops a half-scanned device (layout changed or the camera closed).
    mutating func reset() { pending = [] }
}
