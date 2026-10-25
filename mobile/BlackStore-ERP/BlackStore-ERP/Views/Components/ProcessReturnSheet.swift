import SwiftUI

/// Sheet to return a sold device or accessory: condition, refund amount and reason (PRD FR-23).
public struct ProcessReturnSheet: View {
    @Environment(\.dismiss) private var dismiss
    @ObservedObject public var viewModel: SaleDetailViewModel
    public let line: SaleLine

    @State private var resultType: ReturnResult = .backToStock
    @State private var refundAmountText: String = ""
    @State private var reason: String = ""
    @State private var isConfirming = false

    public init(viewModel: SaleDetailViewModel, line: SaleLine) {
        self.viewModel = viewModel
        self.line = line
    }

    private var parsedRefund: Double? {
        Double(refundAmountText.replacingOccurrences(of: " ", with: ""))
    }

    private var enteredRefundAmount: Double { parsedRefund ?? 0.0 }

    /// Refund must be a number between 0 and what is still returnable on this line.
    private var canSubmit: Bool {
        guard let amount = parsedRefund else { return false }
        let maxRefund = (Double(line.unitPrice) ?? 0) * Double(line.activeQuantity)
        return amount >= 0 && amount <= maxRefund
    }

    public var body: some View {
        NavigationStack {
            Form {
                Section("Mahsulot") {
                    LabeledContent("Model", value: line.productModel.name)
                    if let item = line.item, let firstId = item.identifiers.first {
                        LabeledContent(firstId.type, value: firstId.value)
                    }
                    MoneyRow(title: "Sotilgan narx", amount: APIConfig.formatMoney(line.unitPrice))
                }
                returnOptionsSection
                if let err = viewModel.errorMessage {
                    Section { Label(err, systemImage: "exclamationmark.triangle.fill").foregroundStyle(.red) }
                }
            }
            .salesKeyboardDoneBar()
            .safeAreaInset(edge: .bottom) {
                SalesBottomBar(
                    title: "Qaytarishni tasdiqlash (\(APIConfig.formatMoney(enteredRefundAmount)))",
                    isBusy: viewModel.isSubmitting,
                    isDisabled: !canSubmit
                ) { isConfirming = true }
                .tint(.red)
            }
            .navigationTitle("Mahsulotni qaytarish")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Bekor qilish") { dismiss() }
                }
            }
            .confirmationDialog("Qaytarishni tasdiqlaysizmi?", isPresented: $isConfirming, titleVisibility: .visible) {
                Button("Qaytarish (\(APIConfig.formatMoney(enteredRefundAmount)))", role: .destructive, action: submitReturn)
            } message: {
                Text("Mijozga \(APIConfig.formatMoney(enteredRefundAmount)) qaytariladi.")
            }
            .onAppear { refundAmountText = line.unitPrice }
        }
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.visible)
        .interactiveDismissDisabled(viewModel.isSubmitting)
    }

    private var returnOptionsSection: some View {
        Section {
            Picker("Mahsulot holati", selection: $resultType) {
                ForEach(ReturnResult.allCases) { res in
                    Text(res.title).tag(res)
                }
            }
            LabeledContent("Qaytariladigan summa (\(APIConfig.currency))") {
                TextField("0.00", text: $refundAmountText)
                    .keyboardType(.decimalPad)
                    .multilineTextAlignment(.trailing)
                    .monospacedDigit()
                    .salesDecimalCommaFix($refundAmountText)
            }
            TextField("Qaytarish sababi (ixtiyoriy)", text: $reason, axis: .vertical)
        } header: {
            Text("Qaytarish parametrlari")
        } footer: {
            Text("Sotuvga yaroqli bo'lsa, mahsulot omborga qaytadi.")
        }
    }

    private func submitReturn() {
        Task {
            let success = await viewModel.processReturn(
                saleItemId: line.id,
                quantity: line.quantity,
                refundAmount: enteredRefundAmount,
                result: resultType.rawValue,
                reason: reason.isEmpty ? nil : reason
            )
            if success { dismiss() }
        }
    }
}
