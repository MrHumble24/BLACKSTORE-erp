import SwiftUI

/// Modal sheet for recording a cash or card payment against a debt sale (PRD FR-21, W3).
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

    public var body: some View {
        NavigationStack {
            Form {
                debtSummarySection

                paymentInputSection

                if let err = viewModel.errorMessage {
                    Section {
                        Text(err)
                            .font(.caption)
                            .foregroundStyle(.red)
                    }
                }

                Section {
                    Button(action: submitPayment) {
                        if viewModel.isSubmitting {
                            ProgressView()
                                .frame(maxWidth: .infinity)
                        } else {
                            Text("To'lovni tasdiqlash (\(formattedEnteredAmount))")
                                .font(.headline)
                                .frame(maxWidth: .infinity)
                        }
                    }
                    .buttonStyle(.borderedProminent)
                    .controlSize(.large)
                    .disabled(viewModel.isSubmitting || enteredAmount <= 0)
                }
            }
            .navigationTitle("Nasiya to'lovini qabul qilish")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Bekor qilish") { dismiss() }
                }
            }
            .onAppear {
                amountText = String(format: "%.2f", remainingBalance)
            }
        }
    }

    private var debtSummarySection: some View {
        Section("Qarz ma'lumotlari") {
            if let customer = viewModel.sale.customer {
                LabeledContent("Xaridor", value: customer.name)
            }
            LabeledContent("Jami summa", value: APIConfig.formatMoney(viewModel.sale.total))
            LabeledContent("To'langan", value: APIConfig.formatMoney(viewModel.sale.paid))
            HStack {
                Text("Qoldiq qarz:")
                    .fontWeight(.semibold)
                Spacer()
                Text(APIConfig.formatMoney(viewModel.sale.balance))
                    .font(.headline)
                    .foregroundStyle(.red)
            }
        }
    }

    private var paymentInputSection: some View {
        Section("To'lov miqdori va usuli") {
            Picker("To'lov usuli", selection: $paymentMethod) {
                Text("Naqd").tag("CASH")
                Text("Karta").tag("CARD")
            }
            .pickerStyle(.segmented)

            HStack {
                Text("Summa ($):")
                Spacer()
                TextField("0.00", text: $amountText)
                    .keyboardType(.decimalPad)
                    .multilineTextAlignment(.trailing)
                    .textFieldStyle(.roundedBorder)
                    .frame(width: 120)
            }

            HStack {
                Button("To'liq qoldiq") {
                    amountText = String(format: "%.2f", remainingBalance)
                    HapticManager.selection()
                }
                .buttonStyle(.bordered)
                .controlSize(.small)

                if remainingBalance > 50 {
                    Button("50%") {
                        amountText = String(format: "%.2f", remainingBalance / 2)
                        HapticManager.selection()
                    }
                    .buttonStyle(.bordered)
                    .controlSize(.small)
                }
            }
        }
    }

    private var enteredAmount: Double {
        Double(amountText.replacingOccurrences(of: " ", with: "")) ?? 0.0
    }

    private var formattedEnteredAmount: String {
        APIConfig.formatMoney(enteredAmount)
    }

    private func submitPayment() {
        Task {
            let success = await viewModel.recordPayment(amount: enteredAmount, method: paymentMethod)
            if success {
                dismiss()
            }
        }
    }
}
