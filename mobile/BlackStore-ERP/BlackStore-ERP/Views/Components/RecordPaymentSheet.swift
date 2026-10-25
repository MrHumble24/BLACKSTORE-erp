import SwiftUI

/// Sheet to take a cash or card payment against a debt sale (PRD FR-21, W3).
public struct RecordPaymentSheet: View {
    @Environment(\.dismiss) private var dismiss
    @ObservedObject public var viewModel: SaleDetailViewModel

    @State private var amountText: String = ""
    @State private var paymentMethod: String = "CASH"

    public init(viewModel: SaleDetailViewModel) {
        self.viewModel = viewModel
    }

    private var remainingBalance: Double {
        guard let bal = viewModel.sale.balance else { return 0.0 }
        return Double(bal) ?? 0.0
    }

    private var enteredAmount: Double {
        Double(amountText.replacingOccurrences(of: " ", with: "")) ?? 0.0
    }

    public var body: some View {
        NavigationStack {
            Form {
                debtSummarySection
                paymentInputSection
                if let err = viewModel.errorMessage {
                    Section { Label(err, systemImage: "exclamationmark.triangle.fill").foregroundStyle(.red) }
                }
            }
            .keyboardDoneBar()
            .safeAreaInset(edge: .bottom) {
                BottomBar(
                    title: "To'lovni tasdiqlash (\(APIConfig.formatMoney(enteredAmount)))",
                    isBusy: viewModel.isSubmitting,
                    isDisabled: enteredAmount <= 0,
                    action: submitPayment
                )
            }
            .navigationTitle("Nasiya to'lovi")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Bekor qilish") { dismiss() }
                }
            }
            .onAppear { amountText = String(format: "%.2f", remainingBalance) }
        }
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.visible)
        .interactiveDismissDisabled(viewModel.isSubmitting)
    }

    private var debtSummarySection: some View {
        Section {
            VStack(spacing: 4) {
                Text("Qoldiq qarz").font(.subheadline).foregroundStyle(.secondary)
                Text(APIConfig.formatMoney(viewModel.sale.balance))
                    .font(.largeTitle.bold())
                    .monospacedDigit()
                    .foregroundStyle(.red)
            }
            .frame(maxWidth: .infinity)
            .accessibilityElement(children: .combine)
            if let customer = viewModel.sale.customer {
                LabeledContent("Xaridor", value: customer.name)
            }
            MoneyRow(title: "Jami summa", amount: APIConfig.formatMoney(viewModel.sale.total))
            MoneyRow(title: "To'langan", amount: APIConfig.formatMoney(viewModel.sale.paid))
        }
    }

    private var paymentInputSection: some View {
        Section {
            Picker("To'lov usuli", selection: $paymentMethod) {
                Text("Naqd").tag("CASH")
                Text("Karta").tag("CARD")
            }
            .pickerStyle(.segmented)
            LabeledContent("Summa (\(APIConfig.currency))") {
                TextField("0.00", text: $amountText)
                    .keyboardType(.decimalPad)
                    .multilineTextAlignment(.trailing)
                    .monospacedDigit()
                    .decimalCommaFix($amountText)
            }
            HStack {
                quickFill("To'liq qoldiq", amount: remainingBalance)
                if remainingBalance > 50 {
                    quickFill("50%", amount: remainingBalance / 2)
                }
            }
        } header: {
            Text("To'lov miqdori va usuli")
        } footer: {
            Text("Qisman to'lash mumkin; qolgani qarzda qoladi.")
        }
    }

    private func quickFill(_ title: String, amount: Double) -> some View {
        Button(title) {
            amountText = String(format: "%.2f", amount)
            HapticManager.selection()
        }
        .buttonStyle(.bordered)
        .frame(minHeight: 44)
    }

    private func submitPayment() {
        Task {
            if await viewModel.recordPayment(amount: enteredAmount, method: paymentMethod) { dismiss() }
        }
    }
}
