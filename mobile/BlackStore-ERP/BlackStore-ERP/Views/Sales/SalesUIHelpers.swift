import SwiftUI

/// Small coloured capsule showing whether a sale is paid or still on debt.
struct SaleStatusBadge: View {
    let status: String

    var body: some View {
        let isPaid = status == "PAID"
        Text(isPaid ? "To'langan" : "Nasiya")
            .font(.caption.weight(.semibold))
            .foregroundStyle(isPaid ? .green : .orange)
            .padding(.horizontal, 8)
            .padding(.vertical, 2)
            .background((isPaid ? Color.green : Color.orange).opacity(0.15), in: Capsule())
            .accessibilityLabel(isPaid ? "Holati: to'langan" : "Holati: nasiya")
    }
}

/// Label on the left, money on the right, with monospaced digits and optional colour.
struct MoneyRow: View {
    let title: String
    let amount: String
    var tint: Color = .primary
    var isBold: Bool = false

    var body: some View {
        LabeledContent(title) {
            Text(amount)
                .monospacedDigit()
                .fontWeight(isBold ? .bold : .regular)
                .foregroundStyle(tint)
        }
    }
}

/// Camera barcode scanner wrapped in its own navigation bar with a Close button.
struct SalesScannerSheet: View {
    let title: String
    let onClose: () -> Void
    let onCode: (String) -> Void

    var body: some View {
        NavigationStack {
            VisionScannerView(onCodeScanned: onCode)
                .ignoresSafeArea(edges: .bottom)
                .navigationTitle(title)
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) {
                        Button("Yopish", action: onClose)
                    }
                }
        }
        .presentationDragIndicator(.visible)
    }
}

/// Shared helpers for the sales screens.
enum SalesFormat {
    /// Positive debt left on a sale, or nil when the sale is fully paid.
    static func debt(of sale: Sale) -> Double? {
        guard let bal = sale.balance, let value = Double(bal), value > 0.01 else { return nil }
        return value
    }

    /// Short local date and time for an ISO-8601 timestamp from the API.
    static func dateTime(_ iso: String) -> String? {
        let date = isoWithFraction.date(from: iso) ?? isoPlain.date(from: iso)
        return date?.formatted(date: .abbreviated, time: .shortened)
    }

    /// Formatters are costly to create, so one of each is kept for all rows.
    private static let isoWithFraction: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return f
    }()
    private static let isoPlain = ISO8601DateFormatter()

    /// "IMEI: 123..." line for the first identifier of a sold item, if any.
    static func identifier(of line: SaleLine) -> String? {
        guard let first = line.item?.identifiers.first else { return nil }
        return "\(first.type): \(first.value)"
    }
}

extension View {
    /// Adds a "Tayyor" button above the keyboard so number pads can be dismissed.
    func salesKeyboardDoneBar() -> some View {
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

extension View {
    /// Turns a typed decimal comma into a dot so amounts parse with `Double(_:)`.
    func salesDecimalCommaFix(_ text: Binding<String>) -> some View {
        onChange(of: text.wrappedValue) { _, value in
            if value.contains(",") { text.wrappedValue = value.replacingOccurrences(of: ",", with: ".") }
        }
    }
}

/// Bottom bar with one large primary button (spinner while busy) and an optional secondary control above it.
struct SalesBottomBar<Secondary: View>: View {
    let title: String
    var systemImage: String? = nil
    var isBusy: Bool = false
    let isDisabled: Bool
    let action: () -> Void
    @ViewBuilder var secondary: Secondary

    var body: some View {
        VStack(spacing: 12) {
            secondary
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
                .monospacedDigit()
                .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.large)
            .disabled(isBusy || isDisabled)
        }
        .padding()
        .background(.bar)
    }
}

extension SalesBottomBar where Secondary == EmptyView {
    /// Bar with only the primary button.
    init(title: String, systemImage: String? = nil, isBusy: Bool = false, isDisabled: Bool, action: @escaping () -> Void) {
        self.init(title: title, systemImage: systemImage, isBusy: isBusy, isDisabled: isDisabled, action: action) { EmptyView() }
    }
}
