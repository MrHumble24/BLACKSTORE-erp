import SwiftUI

/// Detailed view for a specific sale displaying items, payments, returns, and payment collection.
public struct SaleDetailView: View {
    @StateObject private var viewModel: SaleDetailViewModel
    @State private var lineToReturn: SaleLine? = nil
    @State private var isShowingPaymentSheet: Bool = false

    public init(sale: Sale) {
        _viewModel = StateObject(wrappedValue: SaleDetailViewModel(sale: sale))
    }

    private var hasOutstandingDebt: Bool {
        guard let bal = viewModel.sale.balance, let b = Double(bal) else { return false }
        return b > 0.01
    }

    public var body: some View {
        List {
            summarySection

            if hasOutstandingDebt {
                debtActionSection
            }

            itemsSection

            paymentsSection

            if let returns = viewModel.sale.returns, !returns.isEmpty {
                returnsSection(returns: returns)
            }
        }
        .listStyle(.insetGrouped)
        .navigationTitle("Savdo #\(viewModel.sale.id)")
        .navigationBarTitleDisplayMode(.inline)
        .refreshable {
            await viewModel.fetchSale()
        }
        .sheet(item: $lineToReturn) { line in
            ProcessReturnSheet(viewModel: viewModel, line: line)
        }
        .sheet(isPresented: $isShowingPaymentSheet) {
            RecordPaymentSheet(viewModel: viewModel)
        }
    }

    private var summarySection: some View {
        Section("Savdo hisoboti") {
            HStack {
                Text("Holati")
                Spacer()
                statusBadge(for: viewModel.sale.status)
            }
            if let customer = viewModel.sale.customer {
                LabeledContent("Xaridor", value: customer.name)
                LabeledContent("Telefon", value: customer.phone)
            }
            LabeledContent("Jami summa", value: APIConfig.formatMoney(viewModel.sale.total))
            LabeledContent("To'langan", value: APIConfig.formatMoney(viewModel.sale.paid))
            if hasOutstandingDebt {
                HStack {
                    Text("Qoldiq qarz:")
                        .fontWeight(.semibold)
                    Spacer()
                    Text(APIConfig.formatMoney(viewModel.sale.balance))
                        .foregroundStyle(.red)
                        .fontWeight(.bold)
                }
            }
        }
    }

    private var debtActionSection: some View {
        Section {
            Button {
                isShowingPaymentSheet = true
            } label: {
                Label("Nasiya to'lovini qabul qilish", systemImage: "creditcard.and.123")
                    .font(.headline)
                    .foregroundStyle(.green)
                    .frame(maxWidth: .infinity)
            }
        }
    }

    private var itemsSection: some View {
        Section("Sotilgan mahsulotlar") {
            if let items = viewModel.sale.items {
                ForEach(items) { line in
                    itemRow(for: line)
                }
            }
        }
    }

    private func itemRow(for line: SaleLine) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(line.productModel.name)
                        .font(.headline)

                    if let item = line.item, let firstId = item.identifiers.first {
                        Text("\(firstId.type): \(firstId.value)")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }
                }

                Spacer()

                Text("\(line.quantity)x \(APIConfig.formatMoney(line.unitPrice))")
                    .font(.subheadline)
                    .fontWeight(.medium)
            }

            if line.activeQuantity > 0 {
                Button {
                    lineToReturn = line
                } label: {
                    Label("Qaytarish", systemImage: "arrow.uturn.backward")
                        .font(.caption)
                }
                .buttonStyle(.bordered)
                .controlSize(.small)
            } else {
                Text("Qaytarilgan")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(.vertical, 4)
    }

    private var paymentsSection: some View {
        Section("To'lovlar tarixi") {
            if let payments = viewModel.sale.payments, !payments.isEmpty {
                ForEach(payments) { p in
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(p.method == "CASH" ? "Naqd to'lov" : "Karta orqali")
                                .font(.subheadline)
                                .fontWeight(.medium)
                        }
                        Spacer()
                        Text(APIConfig.formatMoney(p.amount))
                            .font(.subheadline)
                            .foregroundStyle(.green)
                    }
                }
            } else {
                Text("To'lovlar qayd etilmagan.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
    }

    private func returnsSection(returns: [SaleReturnRecord]) -> some View {
        Section("Qaytarishlar") {
            ForEach(returns) { ret in
                VStack(alignment: .leading, spacing: 2) {
                    HStack {
                        Text(ret.result == "BACK_TO_STOCK" ? "Omborga qaytgan" : "Nuqsonli")
                            .font(.subheadline)
                            .fontWeight(.medium)
                        Spacer()
                        Text("-\(APIConfig.formatMoney(ret.refundAmount))")
                            .font(.subheadline)
                            .foregroundStyle(.red)
                    }
                    if let reason = ret.reason {
                        Text(reason)
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }
                }
            }
        }
    }

    private func statusBadge(for status: String) -> some View {
        let isPaid = status == "PAID"
        return Text(isPaid ? "To'langan" : "Nasiya")
            .font(.caption2)
            .fontWeight(.semibold)
            .foregroundStyle(isPaid ? .green : .orange)
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
            .background((isPaid ? Color.green : Color.orange).opacity(0.12))
            .clipShape(Capsule())
    }
}
