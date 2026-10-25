import SwiftUI

/// Modal sheet for processing a customer return on a sold device or accessory (PRD FR-23).
public struct ProcessReturnSheet: View {
    @Environment(\.dismiss) private var dismiss
    @ObservedObject public var viewModel: SaleDetailViewModel
    public let line: SaleLine

    @State private var resultType: ReturnResult = .backToStock
    @State private var refundAmountText: String = ""
    @State private var reason: String = ""

    public init(viewModel: SaleDetailViewModel, line: SaleLine) {
        self.viewModel = viewModel
        self.line = line
    }

    public var body: some View {
        NavigationStack {
            Form {
                lineSummarySection

                returnOptionsSection

                if let err = viewModel.errorMessage {
                    Section {
                        Text(err)
                            .font(.caption)
                            .foregroundStyle(.red)
                    }
                }

                Section {
                    Button(action: submitReturn) {
                        if viewModel.isSubmitting {
                            ProgressView()
                                .frame(maxWidth: .infinity)
                        } else {
                            Text("Qaytarishni tasdiqlash (\(formattedRefundAmount))")
                                .font(.headline)
                                .frame(maxWidth: .infinity)
                        }
                    }
                    .buttonStyle(.borderedProminent)
                    .controlSize(.large)
                    .disabled(viewModel.isSubmitting || enteredRefundAmount < 0)
                }
            }
            .navigationTitle("Mahsulotni qaytarish")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Bekor qilish") { dismiss() }
                }
            }
            .onAppear {
                refundAmountText = line.unitPrice
            }
        }
    }

    private var lineSummarySection: some View {
        Section("Mahsulot") {
            LabeledContent("Model", value: line.productModel.name)
            if let item = line.item, let firstId = item.identifiers.first {
                LabeledContent(firstId.type, value: firstId.value)
            }
            LabeledContent("Sotilgan narx", value: APIConfig.formatMoney(line.unitPrice))
        }
    }

    private var returnOptionsSection: some View {
        Section("Qaytarish parametrlari") {
            Picker("Mahsulot holati", selection: $resultType) {
                ForEach(ReturnResult.allCases) { res in
                    Text(res.title).tag(res)
                }
            }

            HStack {
                Text("Qaytariladigan summa ($):")
                Spacer()
                TextField("0.00", text: $refundAmountText)
                    .keyboardType(.decimalPad)
                    .multilineTextAlignment(.trailing)
                    .textFieldStyle(.roundedBorder)
                    .frame(width: 120)
            }

            TextField("Qaytarish sababi (ixtiyoriy)", text: $reason)
        }
    }

    private var enteredRefundAmount: Double {
        Double(refundAmountText.replacingOccurrences(of: " ", with: "")) ?? 0.0
    }

    private var formattedRefundAmount: String {
        APIConfig.formatMoney(enteredRefundAmount)
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
            if success {
                dismiss()
            }
        }
    }
}
