import SwiftUI

/// Centered icon, title, message and an optional button. A plain stack, not ContentUnavailableView,
/// because inside a List row the latter stretches its action button into a tall pill on iOS 26.
struct MessagePanel<Action: View>: View {
    let title: String
    let systemImage: String
    var message: String? = nil
    @ViewBuilder var action: Action

    var body: some View {
        VStack(spacing: 10) {
            Image(systemName: systemImage)
                .font(.system(size: 44, weight: .regular))
                .foregroundStyle(.secondary)
            Text(title).font(.title3.weight(.semibold))
            if let message {
                Text(message).font(.subheadline).foregroundStyle(.secondary)
            }
            action.padding(.top, 6)
        }
        .multilineTextAlignment(.center)
        .frame(maxWidth: .infinity)
        .padding(.vertical, 28)
    }
}

extension MessagePanel where Action == EmptyView {
    init(title: String, systemImage: String, message: String? = nil) {
        self.init(title: title, systemImage: systemImage, message: message) { EmptyView() }
    }
}

/// Error panel with a Retry button, shown instead of a blank page when loading fails.
struct ErrorState: View {
    var title: String = "Yuklab bo'lmadi"
    var systemImage: String = "wifi.exclamationmark"
    let message: String
    let retry: () async -> Void

    var body: some View {
        MessagePanel(title: title, systemImage: systemImage, message: message) {
            Button("Qayta urinish") { Task { await retry() } }
                .buttonStyle(.borderedProminent)
        }
    }
}

/// Full-screen spinner shown while the first load runs.
struct LoadingState: View {
    var body: some View {
        ProgressView("Yuklanmoqda...")
            .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

/// One-line inline error or success message shown inside a list section.
struct InlineMessage: View {
    let text: String
    var isError = true
    var font: Font = .subheadline

    var body: some View {
        Label(text, systemImage: isError ? "exclamationmark.triangle.fill" : "checkmark.circle.fill")
            .font(font)
            .foregroundStyle(isError ? Color.red : Color.green)
    }
}
