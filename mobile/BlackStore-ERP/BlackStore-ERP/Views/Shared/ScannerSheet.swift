import SwiftUI

/// Outcome of the most recent scan, shown directly on the camera scanner HUD.
public struct ScanFeedback: Equatable {
    public let code: String
    public let message: String
    public let isError: Bool

    public init(code: String, message: String, isError: Bool) {
        self.code = code
        self.message = message
        self.isError = isError
    }
}

/// Camera barcode scanner sheet. Renders a prominent feedback banner directly on top of the
/// viewfinder so scan results (success or failure) are clearly visible to the user.
public struct ScannerSheet: View {
    let title: String
    var count: Int? = nil
    var feedback: ScanFeedback? = nil
    var isProcessing: Bool = false
    var onClose: (() -> Void)? = nil
    let onScan: (String) -> Void
    @Environment(\.dismiss) private var dismiss

    @State private var activeFeedback: ScanFeedback? = nil

    public init(
        title: String,
        count: Int? = nil,
        feedback: ScanFeedback? = nil,
        isProcessing: Bool = false,
        onClose: (() -> Void)? = nil,
        onScan: @escaping (String) -> Void
    ) {
        self.title = title
        self.count = count
        self.feedback = feedback
        self.isProcessing = isProcessing
        self.onClose = onClose
        self.onScan = onScan
    }

    public var body: some View {
        NavigationStack {
            ZStack(alignment: .top) {
                VisionScannerView(onCodeScanned: onScan)
                    .ignoresSafeArea(edges: .bottom)

                // Prominent floating HUD directly overlaid on top of the camera viewfinder
                VStack(spacing: 8) {
                    if let fb = activeFeedback ?? feedback {
                        feedbackHUD(fb)
                            .transition(.move(edge: .top).combined(with: .opacity))
                    } else if isProcessing {
                        processingHUD
                            .transition(.move(edge: .top).combined(with: .opacity))
                    }
                }
                .padding(.top, 12)
                .padding(.horizontal, 16)
                .animation(.spring(response: 0.35, dampingFraction: 0.8), value: activeFeedback ?? feedback)
            }
            .safeAreaInset(edge: .bottom) {
                if let count {
                    statusPanel(count: count)
                } else if (activeFeedback ?? feedback) == nil && !isProcessing {
                    idleHint
                        .padding(.bottom, 16)
                }
            }
            .navigationTitle(title)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                if let onClose {
                    ToolbarItem(placement: .cancellationAction) {
                        Button("Yopish", action: onClose)
                    }
                }
            }
            .onAppear {
                activeFeedback = feedback
            }
            .onChange(of: feedback) { _, newFeedback in
                activeFeedback = newFeedback
            }
        }
        .presentationDetents([.large])
        .presentationDragIndicator(.visible)
    }

    private func feedbackHUD(_ fb: ScanFeedback) -> some View {
        HStack(spacing: 12) {
            Image(systemName: fb.isError ? "xmark.circle.fill" : "checkmark.circle.fill")
                .font(.system(size: 26, weight: .bold))
                .foregroundStyle(fb.isError ? Color.red : Color.green)

            VStack(alignment: .leading, spacing: 2) {
                Text(fb.code)
                    .font(.caption.monospaced().weight(.semibold))
                    .foregroundStyle(.secondary)
                    .lineLimit(1)

                Text(fb.message)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(.primary)
                    .lineLimit(2)
            }

            Spacer(minLength: 4)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background {
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .fill(.regularMaterial)
                .overlay {
                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                        .strokeBorder(
                            fb.isError ? Color.red.opacity(0.4) : Color.green.opacity(0.4),
                            lineWidth: 1.5
                        )
                }
                .shadow(color: (fb.isError ? Color.red : Color.green).opacity(0.2), radius: 8, y: 4)
        }
        .accessibilityElement(children: .combine)
    }

    private var processingHUD: some View {
        HStack(spacing: 12) {
            ProgressView()
                .tint(.primary)
            Text("Tekshirilmoqda…")
                .font(.subheadline.weight(.medium))
            Spacer()
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background {
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .fill(.regularMaterial)
                .shadow(color: Color.black.opacity(0.1), radius: 6, y: 3)
        }
    }

    private var idleHint: some View {
        HStack(spacing: 8) {
            Image(systemName: "viewfinder")
                .font(.footnote)
            Text("Shtrix-kod yoki IMEI ni kameraga tuting")
                .font(.footnote)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 8)
        .background(.ultraThinMaterial, in: Capsule())
        .foregroundStyle(.secondary)
    }

    private func statusPanel(count: Int) -> some View {
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

            PrimaryButton(title: "Tugatish", systemImage: "checkmark") {
                if let onClose {
                    onClose()
                } else {
                    dismiss()
                }
            }
        }
        .padding()
        .background(.regularMaterial)
        .animation(.default, value: count)
    }
}
