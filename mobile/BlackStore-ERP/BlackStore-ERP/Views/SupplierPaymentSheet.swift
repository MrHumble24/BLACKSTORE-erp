import SwiftUI

/// Modal sheet to record an overseas payment to a supplier (FR-17).
public struct SupplierPaymentSheet: View {
    @Environment(\.dismiss) private var dismiss
    public let supplierId: Int
    @ObservedObject public var viewModel: SuppliersViewModel

    @State private var amountString: String = ""
    @State private var feeString: String = ""
    @State private var feePaidBy: String = "BUSINESS"
    @State private var selectedInvestorId: Int? = nil
    @State private var note: String = ""
    @State private var isSubmitting: Bool = false

    public init(supplierId: Int, viewModel: SuppliersViewModel) {
        self.supplierId = supplierId
        self.viewModel = viewModel
    }

    public var body: some View {
        NavigationStack {
            Form {
                Section("To'lov summasi ($)") {
                    TextField("0.00", text: $amountString)
                        .keyboardType(.decimalPad)
                }

                Section("O'tkazma komissiyasi (Bank / Hawala)") {
                    TextField("0.00", text: $feeString)
                        .keyboardType(.decimalPad)
                    Picker("Komissiya kimning hisobidan?", selection: $feePaidBy) {
                        Text("Do'kon hisobidan").tag("BUSINESS")
                        Text("Investor hisobidan").tag("INVESTOR")
                    }
                }

                Section("Mablag' manbasi (Ixtiyoriy)") {
                    Picker("Investorni tanlang", selection: $selectedInvestorId) {
                        Text("Do'konning o'z mablag'i").tag(nil as Int?)
                        ForEach(viewModel.investors) { inv in
                            Text(inv.name).tag(inv.id as Int?)
                        }
                    }
                }

                Section("Izoh") {
                    TextField("Masalan: Bank o'tkazma kodi yoki chek raqami", text: $note)
                }
            }
            .navigationTitle("To'lov yuborish")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Bekor qilish") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Yuborish") { submit() }
                        .disabled((Double(amountString) ?? 0) <= 0 || isSubmitting)
                }
            }
            .task { await viewModel.loadInvestors() }
        }
    }

    private func submit() {
        guard let amount = Double(amountString), amount > 0 else { return }
        isSubmitting = true
        HapticManager.medium()

        let fee = Double(feeString) ?? 0
        Task {
            let ok = await viewModel.recordPayment(
                supplierId: supplierId,
                amount: String(format: "%.2f", amount),
                fee: fee > 0 ? String(format: "%.2f", fee) : nil,
                note: note.isEmpty ? nil : note,
                investorId: selectedInvestorId,
                feePaidBy: feePaidBy
            )
            isSubmitting = false
            if ok {
                HapticManager.success()
                dismiss()
            } else {
                HapticManager.error()
            }
        }
    }
}
