import SwiftUI

/// Payment type (segmented), paid amount and, for debt, the due date.
struct CheckoutPaymentSection: View {
    @ObservedObject var viewModel: CheckoutViewModel
    let total: Double
    let showsDueDate: Bool

    var body: some View {
        Section {
            Picker("To'lov turi", selection: $viewModel.paymentType) {
                ForEach(CheckoutPaymentType.allCases) { type in
                    Text(type.rawValue).tag(type)
                }
            }
            .pickerStyle(.segmented)
            .onChange(of: viewModel.paymentType) { _, newType in
                if newType == .debt {
                    viewModel.paidAmountText = "0.00"
                } else if viewModel.paidAmountText == "0.00" || viewModel.paidAmountText.isEmpty {
                    viewModel.paidAmountText = String(format: "%.2f", total)
                }
            }
            if viewModel.paymentType != .debt {
                LabeledContent("To'langan summa (\(APIConfig.currency))") {
                    TextField("0.00", text: $viewModel.paidAmountText)
                        .keyboardType(.decimalPad)
                        .multilineTextAlignment(.trailing)
                        .monospacedDigit()
                        .salesDecimalCommaFix($viewModel.paidAmountText)
                }
            }
            if showsDueDate {
                DatePicker("Qarz muddati", selection: $viewModel.dueDate, in: Date()..., displayedComponents: .date)
            }
        } header: {
            Text("To'lov turi")
        } footer: {
            Text("Qisman to'lovda qolgan summa nasiyaga yoziladi.")
        }
    }
}

/// Chosen customer, or a button to pick one; required when there is debt.
struct CheckoutCustomerSection: View {
    let customer: Customer?
    let isRequired: Bool
    let onPick: () -> Void

    var body: some View {
        Section {
            Button(action: onPick) {
                if let customer {
                    LabeledContent {
                        Text("O'zgartirish")
                    } label: {
                        Text(customer.name).foregroundStyle(.primary)
                        Text(customer.phone)
                    }
                } else {
                    Label("Xaridorni tanlash", systemImage: "person.crop.circle.badge.plus")
                }
            }
            .frame(minHeight: 44)
        } header: {
            Text("Xaridor")
        } footer: {
            if isRequired && customer == nil {
                Text("Nasiya uchun xaridor tanlash shart.").foregroundStyle(.red)
            } else {
                Text("Naqd savdoda ixtiyoriy.")
            }
        }
    }
}

/// Branch and warranty choices for the sale.
struct CheckoutDetailsSection: View {
    @ObservedObject var viewModel: CheckoutViewModel
    let isLoading: Bool
    let onRetry: () async -> Void

    var body: some View {
        Section {
            if isLoading {
                LabeledContent("Filial") { ProgressView() }
            } else if viewModel.locations.isEmpty {
                LabeledContent("Filial") {
                    HStack {
                        Text("Filiallar topilmadi").foregroundStyle(.secondary)
                        Button("Qayta urinish") { Task { await onRetry() } }
                            .buttonStyle(.bordered)
                    }
                }
            } else {
                Picker("Filial", selection: $viewModel.selectedLocation) {
                    ForEach(viewModel.locations) { loc in
                        Text(loc.name).tag(Optional(loc))
                    }
                }
            }
            Picker("Kafolat", selection: $viewModel.warrantyPeriod) {
                ForEach(WarrantyPeriod.allCases) { period in
                    Text(period.rawValue).tag(period)
                }
            }
        } header: {
            Text("Filial va kafolat")
        } footer: {
            Text("Kafolat faqat qurilmalarga qo'llaniladi.")
        }
    }
}

/// Totals: sale amount, what is paid now and the debt left.
struct CheckoutSummarySection: View {
    let total: Double
    let paidText: String
    let debt: Double

    var body: some View {
        Section("Savdo hisoboti") {
            MoneyRow(title: "Umumiy summa", amount: APIConfig.formatMoney(total), isBold: true)
            MoneyRow(title: "To'lanayotgan summa", amount: APIConfig.formatMoney(Double(paidText) ?? 0), tint: .green)
            if debt > 0.01 {
                MoneyRow(title: "Qarz (Nasiya)", amount: APIConfig.formatMoney(debt), tint: .red, isBold: true)
            }
        }
    }
}
