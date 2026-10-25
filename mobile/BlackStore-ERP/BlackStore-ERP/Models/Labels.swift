import Foundation

/// Code 128 encoder (sets B and C) so iOS labels scan like the web's JsBarcode ones (FR-15).
nonisolated enum Code128 {
    /// Bar/space pattern per symbol value, "1" = black module (same table as JsBarcode).
    static let bars: [String] = [
        "11011001100", "11001101100", "11001100110", "10010011000", "10010001100",
        "10001001100", "10011001000", "10011000100", "10001100100", "11001001000",
        "11001000100", "11000100100", "10110011100", "10011011100", "10011001110",
        "10111001100", "10011101100", "10011100110", "11001110010", "11001011100",
        "11001001110", "11011100100", "11001110100", "11101101110", "11101001100",
        "11100101100", "11100100110", "11101100100", "11100110100", "11100110010",
        "11011011000", "11011000110", "11000110110", "10100011000", "10001011000",
        "10001000110", "10110001000", "10001101000", "10001100010", "11010001000",
        "11000101000", "11000100010", "10110111000", "10110001110", "10001101110",
        "10111011000", "10111000110", "10001110110", "11101110110", "11010001110",
        "11000101110", "11011101000", "11011100010", "11011101110", "11101011000",
        "11101000110", "11100010110", "11101101000", "11101100010", "11100011010",
        "11101111010", "11001000010", "11110001010", "10100110000", "10100001100",
        "10010110000", "10010000110", "10000101100", "10000100110", "10110010000",
        "10110000100", "10011010000", "10011000010", "10000110100", "10000110010",
        "11000010010", "11001010000", "11110111010", "11000010100", "10001111010",
        "10100111100", "10010111100", "10010011110", "10111100100", "10011110100",
        "10011110010", "11110100100", "11110010100", "11110010010", "11011011110",
        "11011110110", "11110110110", "10101111000", "10100011110", "10001011110",
        "10111101000", "10111100010", "11110101000", "11110100010", "10111011110",
        "10111101110", "11101011110", "11110101110", "11010000100", "11010010000",
        "11010011100", "1100011101011",
    ]

    /// Module string ("1" black, "0" white) for printable-ASCII text, or nil if it can't be encoded.
    /// Uses code set C for digit pairs and B for everything else, choosing like JsBarcode's auto mode.
    static func modules(for text: String) -> String? {
        let bytes = text.utf8.map(Int.init)
        guard !bytes.isEmpty, bytes.allSatisfy({ (32...126).contains($0) }) else { return nil }
        let startsWithC = digitRun(bytes) >= 2
        let values = [startsWithC ? startC : startB] + (startsWithC ? fromC(bytes) : fromB(bytes))
        let weighted = values.enumerated().reduce(0) { $0 + $1.element * max($1.offset, 1) }
        return (values + [weighted % 103, stop]).map { bars[$0] }.joined()
    }

    private static let startB = 104, startC = 105, toB = 100, toC = 99, stop = 106

    /// Leading digits from `index`.
    private static func digitRun(_ s: [Int], from index: Int = 0) -> Int {
        s[index...].prefix { (48...57).contains($0) }.count
    }

    /// Set C packs digit pairs, then hands the rest to set B.
    private static func fromC(_ s: [Int]) -> [Int] {
        let pairs = digitRun(s) / 2 * 2
        let packed = stride(from: 0, to: pairs, by: 2).map { (s[$0] - 48) * 10 + s[$0 + 1] - 48 }
        return pairs == s.count ? packed : packed + [toB] + fromB(Array(s[pairs...]))
    }

    /// Set B until a whole even run of 4+ digits makes switching to C worth it.
    private static func fromB(_ s: [Int]) -> [Int] {
        if s.count > 4, let i = (1...(s.count - 4)).first(where: { i in
            let run = digitRun(s, from: i)
            return run >= 4 && run % 2 == 0
        }) {
            return s[..<i].map { $0 - 32 } + [toC] + fromC(Array(s[i...]))
        }
        return s.map { $0 - 32 }
    }
}

/// Paper a batch of labels is printed on: plain sheets or the web's 50x30 mm thermal roll.
nonisolated enum LabelPaper: String, CaseIterable, Identifiable, Sendable {
    case a4, letter, roll

    var id: String { rawValue }

    var title: String {
        switch self {
        case .a4: "A4"
        case .letter: "Letter"
        case .roll: "Lenta 50×30"
        }
    }

    /// Page size in PDF points.
    var pageSize: CGSize {
        switch self {
        case .a4: CGSize(width: LabelGeometry.mm(210), height: LabelGeometry.mm(297))
        case .letter: CGSize(width: 612, height: 792)
        case .roll: LabelGeometry.labelSize
        }
    }
}

/// Physical sizes: the web's 50x30 mm label, and the sheet margin and cutting gap.
nonisolated enum LabelGeometry {
    static func mm(_ value: Double) -> CGFloat { CGFloat(value * 72 / 25.4) }
    static let labelSize = CGSize(width: mm(50), height: mm(30))
    static let sheetMargin = mm(8)
    static let sheetGap = mm(3)
}

/// Grid of labels on one page: how many fit and where each one goes (centered on the sheet).
nonisolated struct LabelSheetLayout: Sendable {
    let paper: LabelPaper
    let columns: Int
    let rows: Int

    init(paper: LabelPaper) {
        self.paper = paper
        guard paper != .roll else { columns = 1; rows = 1; return }
        let label = LabelGeometry.labelSize, gap = LabelGeometry.sheetGap
        let usable = CGSize(width: paper.pageSize.width - 2 * LabelGeometry.sheetMargin,
                            height: paper.pageSize.height - 2 * LabelGeometry.sheetMargin)
        columns = Int((usable.width + gap) / (label.width + gap))
        rows = Int((usable.height + gap) / (label.height + gap))
    }

    var perPage: Int { columns * rows }

    /// Pages needed for `count` labels; zero labels means zero pages.
    func pageCount(for count: Int) -> Int { count <= 0 ? 0 : (count + perPage - 1) / perPage }

    /// Rectangle of the label at `slot` (0 ..< perPage) on its page, in points.
    func frame(slot: Int) -> CGRect {
        let label = LabelGeometry.labelSize
        let gap: CGFloat = paper == .roll ? 0 : LabelGeometry.sheetGap
        let stepX: CGFloat = label.width + gap, stepY: CGFloat = label.height + gap
        let gridWidth: CGFloat = CGFloat(columns) * stepX - gap
        let gridHeight: CGFloat = CGFloat(rows) * stepY - gap
        let x: CGFloat = (paper.pageSize.width - gridWidth) / 2 + CGFloat(slot % columns) * stepX
        let y: CGFloat = (paper.pageSize.height - gridHeight) / 2 + CGFloat(slot / columns) * stepY
        return CGRect(origin: CGPoint(x: x, y: y), size: label)
    }
}

/// What one printed label shows: model name, optional sale price, the code and its bars.
nonisolated struct PrintLabel: Identifiable, Sendable {
    let id: Int
    let title: String
    let price: String?
    let code: String
    /// Code 128 modules, encoded once when the label is planned.
    let modules: String
}

/// Why a device has a warning row: printed with a fallback code, or not printed at all.
nonisolated enum LabelWarningReason: Sendable {
    case fallbackCode, noCode, badCode

    var text: String {
        switch self {
        case .fallbackCode: "Tizim kodi yaratilmadi, o'rniga IMEI yoki seriya raqami chop etildi"
        case .noCode: "Tizim kodi yaratilmadi va IMEI yoki seriya raqami yo'q, chop etilmaydi"
        case .badCode: "Kodda shtrix-kodga yaroqsiz belgilar bor, chop etilmaydi"
        }
    }
}

/// A warning row under the preview.
nonisolated struct LabelWarning: Identifiable, Sendable {
    let id: Int
    let title: String
    let reason: LabelWarningReason
}

/// Picks each device's label content from its identifiers and price.
nonisolated enum LabelPlanner {
    /// Barcode value: the shop's system code (like the web), else IMEI, else serial, else any code.
    static func code(from identifiers: [LabelIdentifier]) -> String? {
        for type in ["SYSTEM_CODE", "IMEI", "SERIAL"] {
            if let match = identifiers.first(where: { $0.type == type && !$0.value.isEmpty }) { return match.value }
        }
        return identifiers.first { !$0.value.isEmpty }?.value
    }

    /// The device's label (nil when it can't be printed) and its warning, if any.
    static func plan(_ item: LabelBatchItem, title: String) -> (label: PrintLabel?, warning: LabelWarning?) {
        let warn = { (reason: LabelWarningReason) in LabelWarning(id: item.id, title: title, reason: reason) }
        guard let code = code(from: item.identifiers) else { return (nil, warn(.noCode)) }
        guard let modules = Code128.modules(for: code) else { return (nil, warn(.badCode)) }
        let price = item.salePrice.flatMap { Decimal(string: $0) }.map { $0 > 0 } == true ? item.salePrice : nil
        let label = PrintLabel(id: item.id, title: title, price: price, code: code, modules: modules)
        return (label, item.hasSystemCode ? nil : warn(.fallbackCode))
    }
}

/// `GET /batches/:id`, only the fields labels need (no cost fields are decoded).
nonisolated struct LabelBatch: Decodable, Sendable {
    let lines: [LabelBatchLine]
}

/// One batch line; accessory lines have no item and get no label.
nonisolated struct LabelBatchLine: Decodable, Sendable {
    struct Model: Decodable, Sendable { let name: String }
    let productModel: Model
    let item: LabelBatchItem?
}

/// A device on a batch line; `salePrice` is optional until the server sends it.
nonisolated struct LabelBatchItem: Decodable, Sendable {
    let id: Int
    var identifiers: [LabelIdentifier]
    let salePrice: String?

    var hasSystemCode: Bool { identifiers.contains { $0.type == "SYSTEM_CODE" } }
}

/// An item identifier (IMEI, SERIAL, SYSTEM_CODE ...); also the `POST /items/:id/system-code` reply.
nonisolated struct LabelIdentifier: Decodable, Sendable {
    let type: String
    let value: String
}
