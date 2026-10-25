import SwiftUI

/// Customer profile: debt at the top, contact actions, Telegram link and purchase history.
public struct CustomerDetailView: View {
    @StateObject private var viewModel: CustomerDetailViewModel

    public init(customerId: Int) {
        _viewModel = StateObject(wrappedValue: CustomerDetailViewModel(customerId: customerId))
    }

    public var body: some View {
        content
            .navigationTitle(viewModel.customer?.name ?? "Xaridor profili")
            .navigationBarTitleDisplayMode(.inline)
            .task { await viewModel.loadData() }
    }

    @ViewBuilder
    private var content: some View {
        if let customer = viewModel.customer {
            List {
                debtHeader(customer)
                if let err = viewModel.errorMessage {
                    PeopleInlineError(message: err)
                }
                contactSection(customer)
                CustomerTelegramSection(customer: customer, viewModel: viewModel)
                salesSection
            }
            .listStyle(.insetGrouped)
            .refreshable { await viewModel.loadData() }
        } else if let err = viewModel.errorMessage {
            PeopleErrorState(message: err) { await viewModel.loadData() }
        } else {
            PeopleLoadingState()
        }
    }

    private func debtHeader(_ customer: CustomerDetail) -> some View {
        PeopleAmountHeader(
            title: "Jami qarzdorlik",
            amount: Double(customer.debt ?? "") ?? 0,
            tint: customer.hasDebt ? .red : .green
        ) {
            Label(customer.hasDebt ? "Xaridor qarzdor" : "Qarz yo'q",
                  systemImage: customer.hasDebt ? "exclamationmark.circle.fill" : "checkmark.seal.fill")
                .font(.footnote)
                .foregroundStyle(customer.hasDebt ? .red : .green)
        }
    }

    private func contactSection(_ customer: CustomerDetail) -> some View {
        Section("Shaxsiy ma'lumotlar") {
            LabeledContent("Telefon", value: customer.phone)
            if let note = customer.note, !note.isEmpty {
                Text(note).font(.subheadline).foregroundStyle(.secondary)
            }
            HStack(spacing: 12) {
                contactLink("Qo'ng'iroq", icon: "phone.fill", scheme: "tel", phone: customer.phone)
                contactLink("SMS", icon: "message.fill", scheme: "sms", phone: customer.phone)
            }
            .controlSize(.large)
            .listRowInsets(EdgeInsets(top: 8, leading: 16, bottom: 8, trailing: 16))
        }
    }

    @ViewBuilder
    private func contactLink(_ title: String, icon: String, scheme: String, phone: String) -> some View {
        // Keep only digits and "+" so a stored phone cannot inject other URL parts.
        let dialable = phone.filter { $0.isNumber || $0 == "+" }
        if !dialable.isEmpty, let url = URL(string: "\(scheme):\(dialable)") {
            Link(destination: url) {
                Label(title, systemImage: icon).frame(maxWidth: .infinity)
            }
            .buttonStyle(.bordered)
        }
    }

    private var salesSection: some View {
        Section {
            if viewModel.sales.isEmpty {
                Text("Xaridlar mavjud emas").foregroundStyle(.secondary)
            } else {
                ForEach(viewModel.sales) { sale in
                    NavigationLink {
                        SaleDetailView(sale: sale)
                    } label: {
                        saleRow(sale)
                    }
                }
            }
        } header: {
            Text("Xaridlar tarixi (\(viewModel.sales.count))")
        } footer: {
            Text("Har bir xarid: sana, summa va qolgan qarz.")
        }
    }

    /// Sale line: number, date, total, and the remaining debt in red (or "To'langan").
    private func saleRow(_ sale: Sale) -> some View {
        let balance = Double(sale.balance ?? "") ?? 0
        return HStack(alignment: .firstTextBaseline, spacing: 12) {
            VStack(alignment: .leading, spacing: 3) {
                Text("Savdo #\(sale.id)").font(.body)
                Text(PeopleDate.display(sale.createdAt))
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            Spacer(minLength: 8)
            VStack(alignment: .trailing, spacing: 3) {
                Text(APIConfig.formatMoney(sale.total)).font(.body.weight(.semibold))
                Text(balance > 0.01 ? "Qarz: \(APIConfig.formatMoney(balance))" : "To'langan")
                    .font(.footnote)
                    .foregroundStyle(balance > 0.01 ? .red : .green)
            }
            .monospacedDigit()
        }
        .padding(.vertical, 2)
        .accessibilityElement(children: .combine)
    }
}
