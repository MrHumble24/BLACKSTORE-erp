import SwiftUI

/// One statement line: what happened, when, and a signed amount coloured by direction.
struct PeopleStatementRow: View {
    let title: String
    var subtitle: String? = nil
    let date: String
    let amount: Double
    /// Overrides the default sign colour (green in, red out).
    var amountTint: Color? = nil

    var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: 12) {
            VStack(alignment: .leading, spacing: 3) {
                Text(title).font(.body)
                if let subtitle, !subtitle.isEmpty {
                    Text(subtitle)
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
                Text(PeopleDate.display(date))
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            Spacer(minLength: 8)
            Text((amount >= 0 ? "+" : "−") + APIConfig.formatMoney(abs(amount)))
                .font(.body.weight(.semibold))
                .monospacedDigit()
                .foregroundStyle(amountTint ?? peopleSignTint(amount))
        }
        .padding(.vertical, 2)
        .accessibilityElement(children: .combine)
    }
}

/// Turns server ISO dates into short local text.
enum PeopleDate {
    private static let withFraction: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return f
    }()
    private static let plain = ISO8601DateFormatter()

    /// "25 Oct 2026, 14:05" for a timestamp, or the raw yyyy-MM-dd when no time is given.
    static func display(_ iso: String) -> String {
        guard let date = withFraction.date(from: iso) ?? plain.date(from: iso) else {
            return String(iso.prefix(10))
        }
        return date.formatted(date: .abbreviated, time: .shortened)
    }
}
