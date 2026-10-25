import SwiftUI

/// Error screen with a Retry button, shown instead of a blank page when loading fails.
struct ErrorState: View {
    var title: String = "Yuklab bo'lmadi"
    var systemImage: String = "wifi.exclamationmark"
    let message: String
    let retry: () async -> Void

    var body: some View {
        ContentUnavailableView {
            Label(title, systemImage: systemImage)
        } description: {
            Text(message)
        } actions: {
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
