import SwiftUI

/// Outcome of the most recent scan, shown under the camera.
struct ScanFeedback: Equatable {
    let code: String
    let message: String
    let isError: Bool
}

/// Camera sheet for continuous scanning: running count, last scanned item and a finish button.
struct StockScannerSheet: View {
    let title: String
    let count: Int
    let feedback: ScanFeedback?
    let onScan: (String) -> Void
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            VisionScannerView(onCodeScanned: onScan)
                .ignoresSafeArea(edges: .bottom)
                .safeAreaInset(edge: .bottom) { statusPanel }
                .navigationTitle(title)
                .navigationBarTitleDisplayMode(.inline)
        }
        .presentationDetents([.large])
        .presentationDragIndicator(.visible)
    }

    private var statusPanel: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .firstTextBaseline) {
                Text("\(count)")
                    .font(.largeTitle.bold())
                    .monospacedDigit()
                    .contentTransition(.numericText())
                Text("ta skanerlandi")
                    .foregroundStyle(.secondary)
                Spacer()
            }
            .accessibilityElement(children: .combine)

            lastScanRow

            StockPrimaryButton(title: "Tugatish", systemImage: "checkmark") { dismiss() }
        }
        .padding()
        .background(.regularMaterial)
        .animation(.default, value: count)
    }

    @ViewBuilder
    private var lastScanRow: some View {
        if let feedback {
            HStack(spacing: 10) {
                Image(systemName: feedback.isError ? "xmark.octagon.fill" : "checkmark.circle.fill")
                    .foregroundStyle(feedback.isError ? Color.red : Color.green)
                    .font(.title3)
                VStack(alignment: .leading, spacing: 2) {
                    Text(feedback.code).font(.subheadline.monospaced()).lineLimit(1)
                    Text(feedback.message).font(.caption).foregroundStyle(.secondary).lineLimit(2)
                }
            }
            .accessibilityElement(children: .combine)
        } else {
            Text("Shtrix-kod yoki IMEI ni kameraga tuting")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
    }
}
