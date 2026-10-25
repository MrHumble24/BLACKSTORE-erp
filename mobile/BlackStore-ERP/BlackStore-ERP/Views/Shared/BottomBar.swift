import SwiftUI

/// Full-width large prominent button with a spinner while busy; the one primary action of a screen.
struct PrimaryButton: View {
    let title: String
    var systemImage: String? = nil
    var isBusy: Bool = false
    var isDisabled: Bool = false
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
            .monospacedDigit()
            .frame(maxWidth: .infinity)
        }
        .buttonStyle(.borderedProminent)
        .controlSize(.large)
        .disabled(isBusy || isDisabled)
    }
}

/// Bottom bar with one primary button and an optional secondary control above it.
struct BottomBar<Secondary: View>: View {
    let title: String
    var systemImage: String? = nil
    var isBusy: Bool = false
    let isDisabled: Bool
    let action: () -> Void
    @ViewBuilder var secondary: Secondary

    var body: some View {
        VStack(spacing: 12) {
            secondary
            PrimaryButton(title: title, systemImage: systemImage, isBusy: isBusy, isDisabled: isDisabled, action: action)
        }
        .padding()
        .background(.bar)
    }
}

extension BottomBar where Secondary == EmptyView {
    /// Bar with only the primary button.
    init(title: String, systemImage: String? = nil, isBusy: Bool = false, isDisabled: Bool, action: @escaping () -> Void) {
        self.init(title: title, systemImage: systemImage, isBusy: isBusy, isDisabled: isDisabled, action: action) { EmptyView() }
    }
}
