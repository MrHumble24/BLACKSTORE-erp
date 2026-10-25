import SwiftUI
import VisionKit
import Vision

/// Camera barcode and IMEI scanner using Apple VisionKit DataScannerViewController.
public struct VisionScannerView: UIViewControllerRepresentable {
    public let onCodeScanned: (String) -> Void

    public init(onCodeScanned: @escaping (String) -> Void) {
        self.onCodeScanned = onCodeScanned
    }

    public func makeUIViewController(context: Context) -> UIViewController {
        guard DataScannerViewController.isSupported && DataScannerViewController.isAvailable else {
            return makeFallbackViewController()
        }

        let scanner = DataScannerViewController(
            recognizedDataTypes: [
                .barcode(symbologies: [.code128, .qr, .ean13, .code39]),
                .text(textContentType: nil)
            ],
            qualityLevel: .balanced,
            recognizesMultipleItems: false,
            isHighFrameRateTrackingEnabled: true,
            isPinchToZoomEnabled: true,
            isGuidanceEnabled: true,
            isHighlightingEnabled: true
        )

        scanner.delegate = context.coordinator
        try? scanner.startScanning()
        return scanner
    }

    public func updateUIViewController(_ uiViewController: UIViewController, context: Context) {
        // Scanner runs while the view controller is presented.
    }


    public func makeCoordinator() -> Coordinator {
        Coordinator(parent: self)
    }

    private func makeFallbackViewController() -> UIViewController {
        let vc = UIViewController()
        let label = UILabel()
        label.text = "Kamera skaneri ushbu qurilmada mavjud emas (Simulyator)."
        label.textAlignment = .center
        label.numberOfLines = 0
        label.textColor = .secondaryLabel
        label.translatesAutoresizingMaskIntoConstraints = false
        vc.view.addSubview(label)
        NSLayoutConstraint.activate([
            label.centerXAnchor.constraint(equalTo: vc.view.centerXAnchor),
            label.centerYAnchor.constraint(equalTo: vc.view.centerYAnchor),
            label.leadingAnchor.constraint(greaterThanOrEqualTo: vc.view.leadingAnchor, constant: 20)
        ])
        return vc
    }

    public class Coordinator: NSObject, DataScannerViewControllerDelegate {
        let parent: VisionScannerView
        private var lastScannedCode: String = ""
        private var lastScanTime: Date = .distantPast

        init(parent: VisionScannerView) {
            self.parent = parent
        }

        public func dataScanner(_ dataScanner: DataScannerViewController, didTapOn item: RecognizedItem) {
            handleItem(item)
        }

        public func dataScanner(_ dataScanner: DataScannerViewController, didAdd addedItems: [RecognizedItem], allItems: [RecognizedItem]) {
            if let first = addedItems.first {
                handleItem(first)
            }
        }

        private func handleItem(_ item: RecognizedItem) {
            let code: String
            switch item {
            case .barcode(let barcode):
                code = barcode.payloadStringValue ?? ""
            case .text(let text):
                code = text.transcript.trimmingCharacters(in: .whitespacesAndNewlines)
            @unknown default:
                return
            }

            guard !code.isEmpty else { return }

            // Debounce duplicate scans within 1.5 seconds
            let now = Date()
            if code == lastScannedCode && now.timeIntervalSince(lastScanTime) < 1.5 {
                return
            }

            lastScannedCode = code
            lastScanTime = now

            Task { @MainActor in
                HapticManager.scanSuccess()
                self.parent.onCodeScanned(code)
            }
        }
    }
}
