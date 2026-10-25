import SwiftUI

/// Sheet modal to record investor cash deposit or payout (FR-10).
public struct InvestorTransactionSheet: View {
    @Environment(\.dismiss) private var dismiss
    public let investorId: Int
    public let investorName: String
    @ObservedObject public var viewModel: InvestorsViewModel

    @State private var txType: String = "DEPOSIT"
    @State private var amountString: String = ""
    @State private var note: String = ""
    @State private var isSubmitting: Bool = false

    public init(investorId: Int, investorName: String, viewModel: InvestorsViewModel) {
        self.investorId = investorId
        self.investorName = investorName
        self.viewModel = viewModel
    }

    public var body: some View {
        NavigationStack {
            Form {
                Section("Investor") {
                    Text(investorName).font(.headline)
                }

                Section("Tranzaksiya turi") {
                    Picker("Turi", selection: $txType) {
                        Text("Depozit (Kirim)").tag("DEPOSIT")
                        Text("To'lov (Chiqim)").tag("PAYOUT")
                    }
                    .pickerStyle(.segmented)
                }

                Section("Summa ($)") {
                    TextField("0.00", text: $amountString)
                        .keyboardType(.decimalPad)
                }

                Section("Izoh (Ixtiyoriy)") {
                    TextField("Masalan: Bank o'tkazmasi orqali", text: $note)
                }
            }
            .navigationTitle("Tranzaksiya qo'shish")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Bekor qilish") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Saqlash") { submit() }
                        .disabled((Double(amountString) ?? 0) <= 0 || isSubmitting)
                }
            }
        }
    }

    private func submit() {
        guard let amount = Double(amountString), amount > 0 else { return }
        isSubmitting = true
        HapticManager.medium()

        Task {
            let success = await viewModel.recordTransaction(
                id: investorId,
                type: txType,
                amount: amount,
                note: note.isEmpty ? nil : note
            )
            isSubmitting = false
            if success {
                HapticManager.success()
                dismiss()
            } else {
                HapticManager.error()
            }
        }
    }
}
