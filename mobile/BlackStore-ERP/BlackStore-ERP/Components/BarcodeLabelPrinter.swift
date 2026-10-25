import UIKit
import CoreImage.CIFilterBuiltins

/// Generates Code 128 barcodes and prints physical price/inventory labels via AirPrint (FR-15).
public final class BarcodeLabelPrinter: Sendable {
    public static let shared = BarcodeLabelPrinter()

    private init() {}

    /// Generates high-resolution UIImage of Code 128 barcode from raw text.
    public func generateBarcode(from text: String) -> UIImage? {
        let clean = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard let data = clean.data(using: .ascii) else { return nil }

        let filter = CIFilter(name: "CICode128BarcodeGenerator")
        filter?.setValue(data, forKey: "inputMessage")
        filter?.setValue(7.0, forKey: "inputQuietSpace")

        guard let outputImage = filter?.outputImage else { return nil }
        let transform = CGAffineTransform(scaleX: 3, y: 3)
        let scaledImage = outputImage.transformed(by: transform)

        let context = CIContext()
        guard let cgImage = context.createCGImage(scaledImage, from: scaledImage.extent) else { return nil }
        return UIImage(cgImage: cgImage)
    }

    /// Renders a full printable label card (50mm x 30mm ratio).
    @MainActor
    public func renderLabelImage(
        storeName: String = "BLACKSTORE",
        title: String,
        code: String,
        price: String?
    ) -> UIImage {
        let size = CGSize(width: 380, height: 220)
        let renderer = UIGraphicsImageRenderer(size: size)

        return renderer.image { ctx in
            // Background
            UIColor.white.setFill()
            ctx.fill(CGRect(origin: .zero, size: size))

            // Border
            UIColor.systemGray4.setStroke()
            let borderRect = CGRect(x: 8, y: 8, width: size.width - 16, height: size.height - 16)
            let borderPath = UIBezierPath(roundedRect: borderRect, cornerRadius: 8)
            borderPath.lineWidth = 1.5
            borderPath.stroke()

            // Header (Store Name)
            let headerAttrs: [NSAttributedString.Key: Any] = [
                .font: UIFont.systemFont(ofSize: 14, weight: .black),
                .foregroundColor: UIColor.black
            ]
            (storeName as NSString).draw(at: CGPoint(x: 20, y: 16), withAttributes: headerAttrs)

            // Price badge top right
            if let p = price, !p.isEmpty {
                let formattedPrice = APIConfig.formatMoney(p)
                let priceAttrs: [NSAttributedString.Key: Any] = [
                    .font: UIFont.systemFont(ofSize: 15, weight: .heavy),
                    .foregroundColor: UIColor.black
                ]
                let priceSize = (formattedPrice as NSString).size(withAttributes: priceAttrs)
                (formattedPrice as NSString).draw(
                    at: CGPoint(x: size.width - 20 - priceSize.width, y: 15),
                    withAttributes: priceAttrs
                )
            }

            // Product Title
            let titleAttrs: [NSAttributedString.Key: Any] = [
                .font: UIFont.systemFont(ofSize: 13, weight: .semibold),
                .foregroundColor: UIColor.darkGray
            ]
            let titleRect = CGRect(x: 20, y: 38, width: size.width - 40, height: 36)
            (title as NSString).draw(in: titleRect, withAttributes: titleAttrs)

            // Barcode Image
            if let barcode = generateBarcode(from: code) {
                let barcodeRect = CGRect(x: 20, y: 78, width: size.width - 40, height: 85)
                barcode.draw(in: barcodeRect)
            }

            // Code text below barcode
            let codeAttrs: [NSAttributedString.Key: Any] = [
                .font: UIFont.monospacedSystemFont(ofSize: 12, weight: .bold),
                .foregroundColor: UIColor.black
            ]
            let codeSize = (code as NSString).size(withAttributes: codeAttrs)
            (code as NSString).draw(
                at: CGPoint(x: (size.width - codeSize.width) / 2, y: 172),
                withAttributes: codeAttrs
            )
        }
    }

    /// Triggers native iOS AirPrint controller to print physical label.
    @MainActor
    public func printLabel(image: UIImage, jobName: String) {
        let printController = UIPrintInteractionController.shared
        let printInfo = UIPrintInfo(dictionary: nil)
        printInfo.outputType = .general
        printInfo.jobName = jobName
        printController.printInfo = printInfo
        printController.printingItem = image
        printController.present(animated: true, completionHandler: nil)
    }
}
