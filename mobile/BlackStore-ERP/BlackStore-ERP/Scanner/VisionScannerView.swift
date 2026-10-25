import SwiftUI
import AVFoundation
import VisionKit
import Vision

/// Camera barcode and IMEI scanner; shows a clear reason (no permission / unsupported device) when the camera can't run.
public struct VisionScannerView: View {
    public let onCodeScanned: (String) -> Void
    @State private var authStatus = AVCaptureDevice.authorizationStatus(for: .video)
    @State private var isAvailable = DataScannerViewController.isAvailable
    @Environment(\.scenePhase) private var scenePhase

    public init(onCodeScanned: @escaping (String) -> Void) {
        self.onCodeScanned = onCodeScanned
    }

    public var body: some View {
        Group {
            if !DataScannerViewController.isSupported {
                ScannerUnavailableView(reason: .unsupported)
            } else if authStatus == .denied {
                ScannerUnavailableView(reason: .permissionDenied)
            } else if authStatus == .restricted {
                ScannerUnavailableView(reason: .restricted)
            } else if authStatus == .notDetermined {
                ProgressView("Kameraga ruxsat so'ralmoqda…")
            } else {
                DataScannerRepresentable(onCodeScanned: onCodeScanned)
            }
        }
        .task { await requestAccessIfNeeded() }
        // Re-check when the user comes back from Settings.
        .onChange(of: scenePhase) { _, phase in
            if phase == .active { refreshStatus() }
        }
    }

    private func refreshStatus() {
        authStatus = AVCaptureDevice.authorizationStatus(for: .video)
        isAvailable = DataScannerViewController.isAvailable
    }

    private func requestAccessIfNeeded() async {
        guard authStatus == .notDetermined else { return }
        _ = await AVCaptureDevice.requestAccess(for: .video)
        refreshStatus()
    }
}

/// Explains why scanning is not possible and, for a denied permission, links to the app's Settings page.
private struct ScannerUnavailableView: View {
    enum Reason { case unsupported, permissionDenied, restricted, unavailable }
    let reason: Reason
    @Environment(\.openURL) private var openURL

    var body: some View {
        ContentUnavailableView {
            Label(title, systemImage: reason == .permissionDenied ? "camera.badge.ellipsis" : "camera.slash")
        } description: {
            Text(message)
        } actions: {
            if reason == .permissionDenied || reason == .unavailable, let url = URL(string: UIApplication.openSettingsURLString) {
                Button("Sozlamalarni ochish") { openURL(url) }
                    .buttonStyle(.borderedProminent)
                    .controlSize(.large)
            }
        }
    }

    private var title: String {
        switch reason {
        case .unsupported: return "Kamera skaneri mavjud emas"
        case .permissionDenied: return "Kameraga ruxsat berilmagan"
        case .restricted: return "Kamera cheklangan"
        case .unavailable: return "Kamera hozir ishlamayapti"
        }
    }

    private var message: String {
        switch reason {
        case .unsupported:
            #if targetEnvironment(simulator)
            return "Simulyatorda kamera yo'q. Kodni qo'lda kiriting yoki haqiqiy iPhone'da sinab ko'ring."
            #else
            return "Ushbu qurilma kamera skanerini qo'llab-quvvatlamaydi. Kodni qo'lda kiriting."
            #endif
        case .permissionDenied:
            return "Skanerlash uchun Sozlamalarda BlackStore ilovasiga kamera ruxsatini yoqing."
        case .restricted:
            return "Kameradan foydalanish qurilma cheklovlari bilan o'chirilgan. Kodni qo'lda kiriting."
        case .unavailable:
            return "Kamera band yoki vaqtincha ishlamayapti. Sozlamalarni tekshiring yoki kodni qo'lda kiriting."
        }
    }
}

/// UIKit bridge around VisionKit's DataScannerViewController with 1.5 s duplicate debounce.
private struct DataScannerRepresentable: UIViewControllerRepresentable {
    let onCodeScanned: (String) -> Void

    func makeUIViewController(context: Context) -> DataScannerViewController {
        let scanner = DataScannerViewController(
            recognizedDataTypes: [
                .barcode(symbologies: [.code128, .qr, .ean13, .code39, .dataMatrix]),
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

    func updateUIViewController(_ uiViewController: DataScannerViewController, context: Context) {
        context.coordinator.onCodeScanned = onCodeScanned
        if !uiViewController.isScanning && DataScannerViewController.isAvailable {
            try? uiViewController.startScanning()
        }
    }

    static func dismantleUIViewController(_ uiViewController: DataScannerViewController, coordinator: Coordinator) {
        uiViewController.stopScanning()
    }

    func makeCoordinator() -> Coordinator {
        Coordinator(onCodeScanned: onCodeScanned)
    }

    /// Receives recognised items and forwards de-duplicated codes.
    final class Coordinator: NSObject, DataScannerViewControllerDelegate {
        var onCodeScanned: (String) -> Void
        private var lastScannedCode = ""
        private var lastScanTime: Date = .distantPast

        init(onCodeScanned: @escaping (String) -> Void) {
            self.onCodeScanned = onCodeScanned
        }

        func dataScanner(_ dataScanner: DataScannerViewController, didTapOn item: RecognizedItem) {
            handleItem(item)
        }

        func dataScanner(_ dataScanner: DataScannerViewController, didAdd addedItems: [RecognizedItem], allItems: [RecognizedItem]) {
            if let first = addedItems.first { handleItem(first) }
        }

        /// Accepts OCR text only if it looks like an IMEI / serial / code.
        // ponytail: naive heuristic (8–32 of A-Z, 0-9, "-", at least one digit), tighten per code format if needed.
        static func isLikelyCode(_ text: String) -> Bool {
            let allowed = CharacterSet.alphanumerics.union(CharacterSet(charactersIn: "-"))
            return (8...32).contains(text.count)
                && text.unicodeScalars.allSatisfy { $0.isASCII && allowed.contains($0) }
                && text.contains(where: \.isNumber)
        }

        private func handleItem(_ item: RecognizedItem) {
            let code: String
            switch item {
            case .barcode(let barcode):
                code = barcode.payloadStringValue ?? ""
            case .text(let text):
                code = text.transcript.trimmingCharacters(in: .whitespacesAndNewlines)
                guard Self.isLikelyCode(code) else { return }
            @unknown default:
                return
            }
            guard !code.isEmpty else { return }

            // Debounce duplicate scans within 1.5 seconds.
            let now = Date()
            if code == lastScannedCode && now.timeIntervalSince(lastScanTime) < 1.5 { return }
            lastScannedCode = code
            lastScanTime = now

            HapticManager.scanSuccess()
            onCodeScanned(code)
        }
    }
}
