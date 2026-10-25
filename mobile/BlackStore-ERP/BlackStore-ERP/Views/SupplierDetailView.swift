import SwiftUI

/// Detailed supplier profile with balance tracking and overseas payments (FR-16, FR-17).
public struct SupplierDetailView: View {
    public let supplierId: Int
    @StateObject private var viewModel = SuppliersViewModel()
    @State private var isShowingPaymentSheet: Bool = false

    public init(supplierId: Int) {
        self.supplierId = supplierId
    }

    public var body: some View {
        List {
            if let err = viewModel.errorMessage {
                Section { Text(err).font(.caption).foregroundStyle(.red) }
            }

            if let d = viewModel.selectedDetail {
                infoSection(for: d)
                balanceSection(for: d)
                paymentsHistorySection
            } else if viewModel.isLoading {
                Section { ProgressView().padding(.vertical, 20) }
            }
        }
        .listStyle(.insetGrouped)
        .navigationTitle(viewModel.selectedDetail?.name ?? "Yetkazib beruvchi")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button {
                    isShowingPaymentSheet = true
                } label: {
                    Label("To'lov yuborish", systemImage: "paperplane.fill")
                }
            }
        }
        .task { await viewModel.fetchSupplierDetail(id: supplierId) }
        .refreshable { await viewModel.fetchSupplierDetail(id: supplierId) }
        .sheet(isPresented: $isShowingPaymentSheet) {
            SupplierPaymentSheet(supplierId: supplierId, viewModel: viewModel)
        }
    }

    private func infoSection(for d: SupplierFull) -> some View {
        Section("Ma'lumotlar") {
            LabeledContent("Nomi", value: d.name)
            if let contact = d.contactInfo, !contact.isEmpty {
                LabeledContent("Kontakt / Manzil", value: contact)
            }
            LabeledContent("Holat", value: d.isActive ? "Faol" : "Nofaol")
        }
    }

    private func balanceSection(for d: SupplierFull) -> some View {
        Section {
            VStack(alignment: .leading, spacing: 6) {
                Text("Qoldiq balans (Bizning qarzimiz)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Text(APIConfig.formatMoney(d.balanceDouble))
                    .font(.system(size: 28, weight: .bold, design: .rounded))
                    .foregroundStyle(d.balanceDouble > 0 ? .red : .primary)
            }
            .padding(.vertical, 4)
        }
    }

    private var paymentsHistorySection: some View {
        Section("Yuborilgan to'lovlar (\(viewModel.payments.count))") {
            if viewModel.payments.isEmpty {
                Text("To'lovlar tarixi mavjud emas")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            } else {
                ForEach(viewModel.payments) { payment in
                    paymentRow(for: payment)
                }
            }
        }
    }

    private func paymentRow(for p: SupplierPaymentItem) -> some View {
        HStack {
            VStack(alignment: .leading, spacing: 3) {
                Text(APIConfig.formatMoney(p.amountDouble))
                    .font(.headline)
                    .foregroundStyle(.primary)
                Text(p.date.prefix(10))
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
            Spacer()
            VStack(alignment: .trailing, spacing: 3) {
                if p.feeDouble > 0 {
                    Text("Komissiya: \(APIConfig.formatMoney(p.feeDouble))")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
                Text(p.feePaidBy == "INVESTOR" ? "Investor hisobidan" : "Do'kon hisobidan")
                    .font(.caption2)
                    .foregroundStyle(p.feePaidBy == "INVESTOR" ? .purple : .blue)
            }
        }
        .padding(.vertical, 2)
    }
}
