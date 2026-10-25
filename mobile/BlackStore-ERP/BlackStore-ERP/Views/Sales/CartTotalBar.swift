import SwiftUI

/// Always-visible bottom bar with the cart total and the "go to payment" button.
struct CartTotalBar: View {
    @ObservedObject var cartViewModel: CartViewModel
    let onCheckout: () -> Void

    var body: some View {
        HStack(spacing: 16) {
            VStack(alignment: .leading, spacing: 2) {
                Text("\(cartViewModel.totalUnitsCount) dona mahsulot")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Text(cartViewModel.formattedTotal)
                    .font(.title2.bold())
                    .monospacedDigit()
                    .contentTransition(.numericText())
            }
            .accessibilityElement(children: .combine)
            Spacer(minLength: 0)
            Button(action: onCheckout) {
                HStack(spacing: 8) {
                    Image(systemName: "creditcard")
                    Text("To'lovga o'tish")
                }
                .font(.headline)
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.large)
            .disabled(cartViewModel.lines.isEmpty || !cartViewModel.allPricesValid)
        }
        .padding(.horizontal)
        .padding(.vertical, 12)
        .background(.bar)
        .overlay(alignment: .top) { Divider() }
        .animation(.default, value: cartViewModel.totalAmount)
    }
}
