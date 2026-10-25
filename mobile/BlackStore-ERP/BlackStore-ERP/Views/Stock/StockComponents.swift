import SwiftUI
import UIKit

/// Small coloured capsule used for statuses and locations across stock screens.
struct StockBadge: View {
    let text: String
    var color: Color = .accentColor

    var body: some View {
        Text(text)
            .font(.caption2.weight(.semibold))
            .foregroundStyle(color)
            .padding(.horizontal, 8)
            .padding(.vertical, 3)
            .background(color.opacity(0.12), in: Capsule())
    }
}

/// One-line inline message (error or success) shown inside a list section.
struct StockMessageRow: View {
    let text: String
    var isError: Bool = true

    var body: some View {
        Label(text, systemImage: isError ? "exclamationmark.triangle.fill" : "checkmark.circle.fill")
            .font(.subheadline)
            .foregroundStyle(isError ? Color.red : Color.green)
    }
}

/// Full-width large prominent button with a spinner while busy; the one primary action of a screen.
struct StockPrimaryButton: View {
    let title: String
    var systemImage: String? = nil
    var isBusy: Bool = false
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Group {
                if isBusy {
                    ProgressView()
                } else if let systemImage {
                    Label(title, systemImage: systemImage)
                } else {
                    Text(title)
                }
            }
            .font(.headline)
            .frame(maxWidth: .infinity)
        }
        .buttonStyle(.borderedProminent)
        .controlSize(.large)
    }
}

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
}

/// Shared ISO-8601 parsers, built once (formatters are costly to create).
private enum StockISOFormatters {
    static let fractional: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter
    }()
    static let plain = ISO8601DateFormatter()
}

/// Formats an ISO-8601 timestamp for display; falls back to the raw string.
func stockFormattedDate(_ iso: String) -> String {
    if let date = StockISOFormatters.fractional.date(from: iso) ?? StockISOFormatters.plain.date(from: iso) {
        return date.formatted(date: .abbreviated, time: .shortened)
    }
    return iso
}

extension Binding where Value == Bool {
    /// True while the optional holds a value; setting false clears it (for alerts and dialogs).
    init<T>(isPresent value: Binding<T?>) {
        self.init(get: { value.wrappedValue != nil }, set: { if !$0 { value.wrappedValue = nil } })
    }
}

/// Capsule filter chip with an optional count and an optional orange "debt" dot.
struct StockFilterChip: View {
    let title: String
    var count: Int = 0
    var hasDebt: Bool = false
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 6) {
                Text(title)
                if count > 0 {
                    Text("\(count)").monospacedDigit().foregroundStyle(isSelected ? .primary : .secondary)
                }
                if hasDebt {
                    Image(systemName: "circle.fill")
                        .font(.system(size: 6))
                        .foregroundStyle(.orange)
                        .accessibilityLabel("Qarzi bor")
                }
            }
            .font(.subheadline.weight(isSelected ? .semibold : .regular))
            .frame(minHeight: 32)
        }
        .buttonStyle(.bordered)
        .buttonBorderShape(.capsule)
        .tint(isSelected ? .accentColor : .secondary)
        .accessibilityAddTraits(isSelected ? .isSelected : [])
    }
}
