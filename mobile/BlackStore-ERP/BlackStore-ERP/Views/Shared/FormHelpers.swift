import SwiftUI
import UIKit

extension View {
    /// Adds a "Tayyor" button above the keyboard so number pads can be dismissed.
    func keyboardDoneBar() -> some View {
        toolbar {
            ToolbarItemGroup(placement: .keyboard) {
                Spacer()
                Button("Tayyor") {
                    UIApplication.shared.sendAction(
                        #selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil
                    )
                }
            }
        }
    }

    /// Turns a typed decimal comma into a dot so amounts parse with `Double(_:)`.
    func decimalCommaFix(_ text: Binding<String>) -> some View {
        onChange(of: text.wrappedValue) { _, value in
            if value.contains(",") { text.wrappedValue = value.replacingOccurrences(of: ",", with: ".") }
        }
    }
}

/// Parses decimal text fields (commas are already dots via `decimalCommaFix`).
enum DecimalInput {
    /// The typed amount, or nil when the text is not a number.
    static func parse(_ text: String) -> Double? {
        Double(text.trimmingCharacters(in: .whitespaces))
    }
}

/// Turns server ISO-8601 timestamps into short local text.
enum DateDisplay {
    /// "25 Oct 2026, 14:05", or nil when the text is not an ISO timestamp.
    static func dateTime(_ iso: String) -> String? {
        let date = withFraction.date(from: iso) ?? plain.date(from: iso)
        return date?.formatted(date: .abbreviated, time: .shortened)
    }

    /// Formatters are costly to create, so one of each is kept for all rows.
    private static let withFraction: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return f
    }()
    private static let plain = ISO8601DateFormatter()
}

extension Binding where Value == Bool {
    /// True while the optional holds a value; setting false clears it (for alerts and dialogs).
    init<T>(isPresent value: Binding<T?>) {
        self.init(get: { value.wrappedValue != nil }, set: { if !$0 { value.wrappedValue = nil } })
    }
}
