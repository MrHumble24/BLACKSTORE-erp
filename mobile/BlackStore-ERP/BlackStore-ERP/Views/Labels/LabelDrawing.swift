import UIKit

/// Draws the 50x30 mm label exactly like the web's batch label card (FR-15), into PDF pages or
/// preview images. Sizes are the web's CSS pixels times 0.75 (1 CSS px = 0.75 pt).
/// Nonisolated so it can run off the main thread (UIGraphics renderers are thread-safe).
nonisolated enum LabelDrawing {
    private static let padding = CGSize(width: 7.5, height: 6)  // px-2.5 / py-2
    private static let titleFont = UIFont.systemFont(ofSize: 7.875, weight: .semibold)  // 10.5px
    private static let titleLineHeight: CGFloat = 7.875 * 1.25  // leading-tight
    private static let priceFont = UIFont.monospacedDigitSystemFont(ofSize: 8.25, weight: .bold)  // 11px; fits under a two-line title
    private static let codeFont = UIFont.monospacedSystemFont(ofSize: 7.125, weight: .medium)  // 9.5px mono
    private static let codeLineHeight: CGFloat = 7.125 * 1.25
    private static let barHeight: CGFloat = 30  // 40px
    private static let moduleWidth: CGFloat = 1.05  // 1.4px
    private static let barGap: CGFloat = 1.5  // gap-0.5
    private static let quietModules = 10  // Code 128 quiet zone on each side

    /// Writes the labels' PDF off the main thread to `<temp>/<folder>/<fileName>` and returns its URL.
    /// Callers give each variant (paper, copies) its own folder, so a slower earlier render can't
    /// overwrite the newer file. Shared by the batch labels and the single-label sheet.
    static func writePDFFile(labels: [PrintLabel], layout: LabelSheetLayout, title: String,
                             folder: String, fileName: String) async throws -> URL {
        let directory = FileManager.default.temporaryDirectory.appendingPathComponent(folder)
        let url = directory.appendingPathComponent(fileName)
        try await Task.detached(priority: .userInitiated) {
            try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
            try writePDF(labels: labels, layout: layout, title: title, to: url)
        }.value
        return url
    }

    /// Writes a PDF of all labels at real page size to `url`, one grid of labels per page.
    static func writePDF(labels: [PrintLabel], layout: LabelSheetLayout, title: String, to url: URL) throws {
        let format = UIGraphicsPDFRendererFormat()
        format.documentInfo = [kCGPDFContextTitle as String: title, kCGPDFContextCreator as String: "BLACKSTORE"]
        let bounds = CGRect(origin: .zero, size: layout.paper.pageSize)
        try UIGraphicsPDFRenderer(bounds: bounds, format: format).writePDF(to: url) { context in
            for page in 0..<layout.pageCount(for: labels.count) {
                context.beginPage()
                drawPage(page, labels: labels, layout: layout)
            }
        }
    }

    /// Bitmap of one page for the on-screen preview, drawn by the same code as the PDF.
    static func pageImage(_ page: Int, labels: [PrintLabel], layout: LabelSheetLayout, width: CGFloat) -> UIImage {
        let size = layout.paper.pageSize
        let format = UIGraphicsImageRendererFormat()
        format.scale = max(1, width / size.width)
        format.opaque = true
        return UIGraphicsImageRenderer(size: size, format: format).image { _ in
            UIColor.white.setFill()
            UIRectFill(CGRect(origin: .zero, size: size))
            drawPage(page, labels: labels, layout: layout)
        }
    }

    /// Draws the labels of `page` into the current UIKit context.
    private static func drawPage(_ page: Int, labels: [PrintLabel], layout: LabelSheetLayout) {
        let first = page * layout.perPage
        for (slot, label) in labels[first..<min(first + layout.perPage, labels.count)].enumerated() {
            let rect = layout.frame(slot: slot)
            if layout.paper != .roll { drawCutGuide(rect) }
            draw(label, in: rect)
        }
    }

    /// Hairline grey outline so sheet labels can be cut out; the roll needs none.
    private static func drawCutGuide(_ rect: CGRect) {
        let path = UIBezierPath(rect: rect.insetBy(dx: 0.15, dy: 0.15))
        path.lineWidth = 0.3
        UIColor(white: 0.75, alpha: 1).setStroke()
        path.stroke()
    }

    /// Fixed two-line name block on top, then the price (only when set), barcode and code at the bottom.
    private static func draw(_ label: PrintLabel, in rect: CGRect) {
        let content = rect.insetBy(dx: padding.width, dy: padding.height)
        let nameBlock = CGRect(x: content.minX, y: content.minY, width: content.width, height: titleLineHeight * 2)
        drawTitle(label.title, in: nameBlock)
        let codeTop = content.maxY - codeLineHeight
        let barTop = codeTop - barGap - barHeight
        if let price = label.price {
            // Digits (cap height) centred between the fixed two-line name block and the bars,
            // so the gap is the same on every label.
            let priceTop = (nameBlock.maxY + barTop + priceFont.capHeight) / 2 - priceFont.ascender
            let priceRect = CGRect(x: content.minX, y: priceTop, width: content.width, height: priceFont.lineHeight)
            drawCentered(APIConfig.formatMoney(price), font: priceFont, in: priceRect)
        }
        drawBars(label.modules, in: CGRect(x: rect.minX, y: barTop, width: rect.width, height: barHeight))
        drawCentered(label.code, font: codeFont, in: CGRect(x: content.minX, y: codeTop, width: content.width, height: codeLineHeight))
    }

    /// Up to two centered lines at the top of `box`, the second truncated.
    private static func drawTitle(_ title: String, in box: CGRect) {
        let style = paragraph()
        style.minimumLineHeight = titleLineHeight
        style.maximumLineHeight = titleLineHeight
        let attributes: [NSAttributedString.Key: Any] = [.font: titleFont, .foregroundColor: UIColor.black, .paragraphStyle: style]
        (title as NSString).draw(with: box, options: [.usesLineFragmentOrigin, .truncatesLastVisibleLine],
                                 attributes: attributes, context: nil)
    }

    /// One line of black text centered in `rect`.
    private static func drawCentered(_ text: String, font: UIFont, in rect: CGRect) {
        let style = paragraph()
        style.lineBreakMode = .byClipping
        let attributes: [NSAttributedString.Key: Any] = [.font: font, .foregroundColor: UIColor.black, .paragraphStyle: style]
        let y = rect.midY - font.lineHeight / 2
        (text as NSString).draw(in: CGRect(x: rect.minX, y: y, width: rect.width, height: font.lineHeight), withAttributes: attributes)
    }

    private static func paragraph() -> NSMutableParagraphStyle {
        let style = NSMutableParagraphStyle()
        style.alignment = .center
        return style
    }

    /// Vector Code 128 bars centered across the label; modules shrink only when the code plus a
    /// 10-module quiet zone on each side would not fit the 1.4px web module width.
    private static func drawBars(_ modules: String, in rect: CGRect) {
        let width = min(moduleWidth, rect.width / CGFloat(modules.count + 2 * quietModules))
        var x = rect.midX - width * CGFloat(modules.count) / 2
        UIColor.black.setFill()
        var runStart: CGFloat?
        for module in modules + "0" {  // trailing "0" closes the last bar
            if module == "1" {
                if runStart == nil { runStart = x }
            } else if let start = runStart {
                UIRectFill(CGRect(x: start, y: rect.minY, width: x - start, height: rect.height))
                runStart = nil
            }
            x += width
        }
    }
}
