import SwiftUI

/// Sheet to record an investor cash deposit or payout (FR-10).
public struct InvestorTransactionSheet: View {
    @Environment(\.dismiss) private var dismiss
    public let investorId: Int
    public let investorName: String
    @ObservedObject public var viewModel: InvestorsViewModel

    @State private var txType: String = "DEPOSIT"
    @State private var amountString: String = ""
    @State private var note: String = ""
    @State private var isSubmitting: Bool = false
    @State private var failed: Bool = false

    public init(investorId: Int, investorName: String, viewModel: InvestorsViewModel) {
        self.investorId = investorId
        self.investorName = investorName
        self.viewModel = viewModel
    }

    /// Valid positive amount, or nil.
    private var amount: Double? {
        guard let value = peopleParseAmount(amountString), value > 0 else { return nil }
        return value
    }

    public var body: some View {
        NavigationStack {
            Form {
                Section {
                    Picker("Turi", selection: $txType) {
                        Text("Depozit (Kirim)").tag("DEPOSIT")
                        Text("To'lov (Chiqim)").tag("PAYOUT")
                    }
                    .pickerStyle(.segmented)
                } header: {
                    Text(investorName)
                } footer: {
                    Text(txType == "DEPOSIT" ? "Investor do'konga pul berdi." : "Do'kon investorga pul to'ladi.")
                }

                Section("Summa ($)") {
                    TextField("0.00", text: peopleDecimalBinding($amountString))
                        .keyboardType(.decimalPad)
                        .font(.title2.weight(.semibold))
                        .monospacedDigit()
                }

                Section("Izoh (ixtiyoriy)") {
                    TextField("Masalan: Bank o'tkazmasi orqali", text: $note)
                }

                if failed, let err = viewModel.errorMessage {
                    PeopleInlineError(message: err)
                }
            }
            .navigationTitle("Tranzaksiya qo'shish")
            .navigationBarTitleDisplayMode(.inline)
            .peopleKeyboardDoneBar()
            .toolbar { toolbarButtons }
        }
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.visible)
        .interactiveDismissDisabled(isSubmitting)
    }

    @ToolbarContentBuilder
    private var toolbarButtons: some ToolbarContent {
        ToolbarItem(placement: .cancellationAction) {
            Button("Bekor qilish") { dismiss() }
        }
        ToolbarItem(placement: .confirmationAction) {
            if isSubmitting {
                ProgressView()
            } else {
                Button("Saqlash") { submit() }
                    .disabled(amount == nil)
            }
        }
    }

    private func submit() {
        guard let amount else { return }
        isSubmitting = true
        failed = false
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
                failed = true
                HapticManager.error()
            }
        }
    }
}
