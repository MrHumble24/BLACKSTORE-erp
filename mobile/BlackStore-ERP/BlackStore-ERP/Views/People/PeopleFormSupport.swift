import SwiftUI
import UIKit

/// Error screen with a Retry button, shown instead of a blank page when loading fails.
struct PeopleErrorState: View {
    let message: String
    let retry: () async -> Void

    var body: some View {
        ContentUnavailableView {
            Label("Yuklab bo'lmadi", systemImage: "wifi.exclamationmark")
        } description: {
            Text(message)
        } actions: {
            Button("Qayta urinish") { Task { await retry() } }
                .buttonStyle(.borderedProminent)
        }
    }
}

/// Red one-line error section shown above a list that already has data.
struct PeopleInlineError: View {
    let message: String

    var body: some View {
        Section {
            Label(message, systemImage: "exclamationmark.triangle.fill")
                .foregroundStyle(.red)
                .font(.footnote)
        }
    }
}

/// Full-screen spinner shown while the first load runs.
struct PeopleLoadingState: View {
    var body: some View {
        ProgressView("Yuklanmoqda...")
            .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

/// Adds a "Tayyor" bar above number pads so the keyboard can be dismissed.
struct PeopleKeyboardDoneBar: ViewModifier {
    func body(content: Content) -> some View {
        content.toolbar {
            ToolbarItemGroup(placement: .keyboard) {
                Spacer()
                Button("Tayyor") {
                    UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
                }
            }
        }
    }
}

extension View {
    /// Shows a "Tayyor" button above the keyboard.
    func peopleKeyboardDoneBar() -> some View { modifier(PeopleKeyboardDoneBar()) }
}

/// Binding that turns a typed decimal comma into a dot, so "12,5" parses as 12.5.
func peopleDecimalBinding(_ text: Binding<String>) -> Binding<String> {
    Binding(
        get: { text.wrappedValue },
        set: { text.wrappedValue = $0.replacingOccurrences(of: ",", with: ".") }
    )
}

/// Parses a decimal text field (commas are already dots via `peopleDecimalBinding`); nil when invalid.
func peopleParseAmount(_ text: String) -> Double? {
    Double(text.trimmingCharacters(in: .whitespaces))
}
