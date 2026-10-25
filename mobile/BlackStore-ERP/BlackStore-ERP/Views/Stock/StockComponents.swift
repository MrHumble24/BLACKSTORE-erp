import SwiftUI

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
