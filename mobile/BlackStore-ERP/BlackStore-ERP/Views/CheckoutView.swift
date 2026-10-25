import SwiftUI

/// Checkout modal sheet for completing the sale with payment, warranty, and customer selection.
public struct CheckoutView: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var viewModel = CheckoutViewModel()
    @ObservedObject public var cartViewModel: CartViewModel
    public let onSaleCompleted: (Sale) -> Void

    @State private var isShowingCustomerPicker: Bool = false

    public init(
        cartViewModel: CartViewModel,
        onSaleCompleted: @escaping (Sale) -> Void
    ) {
        self.cartViewModel = cartViewModel
        self.onSaleCompleted = onSaleCompleted
    }

    public var body: some View {
        NavigationStack {
            Form {
                locationSection
                customerSection
                warrantySection
                paymentSection
                summarySection

                if let err = viewModel.errorMessage {
                    Section {
                        Text(err)
                            .font(.caption)
                            .foregroundStyle(.red)
                    }
                }

                Section {
                    Button(action: submitSale) {
                        if viewModel.isSubmitting {
                            ProgressView()
                                .frame(maxWidth: .infinity)
                        } else {
                            Text("Savdoni yakunlash (\(cartViewModel.formattedTotal))")
                                .font(.headline)
                                .frame(maxWidth: .infinity)
                        }
                    }
                    .buttonStyle(.borderedProminent)
                    .controlSize(.large)
                    .disabled(viewModel.isSubmitting || !cartViewModel.allPricesValid)
                }
            }
            .navigationTitle("To'lov va rasmiylashtirish")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Bekor qilish") { dismiss() }
                }
            }
            .sheet(isPresented: $isShowingCustomerPicker) {
                CustomerPickerSheet { customer in
                    viewModel.selectedCustomer = customer
                }
            }
            .task {
                await viewModel.fetchLocations()
                viewModel.prepare(for: cartViewModel.totalAmount)
            }
        }
    }

    private var locationSection: some View {
        Section("Filial") {
            Picker("Filial", selection: $viewModel.selectedLocation) {
                ForEach(viewModel.locations) { loc in
                    Text(loc.name).tag(Optional(loc))
                }
            }
        }
    }

    private var customerSection: some View {
        Section("Xaridor") {
            if let customer = viewModel.selectedCustomer {
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(customer.name)
                            .font(.headline)
                        Text(customer.phone)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }

                    Spacer()

                    Button("O'zgartirish") {
                        isShowingCustomerPicker = true
                    }
                    .font(.caption)
                    .buttonStyle(.bordered)
                }
            } else {
                Button {
                    isShowingCustomerPicker = true
                } label: {
                    Label("Xaridorni tanlash (Nasiya uchun shart)", systemImage: "person.crop.circle.badge.plus")
                }
            }
        }
    }

    private var warrantySection: some View {
        Section("Kafolat muddati") {
            Picker("Kafolat", selection: $viewModel.warrantyPeriod) {
                ForEach(WarrantyPeriod.allCases) { period in
                    Text(period.rawValue).tag(period)
                }
            }
            .pickerStyle(.segmented)
        }
    }

    private var paymentSection: some View {
        Section("To'lov turi") {
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
                    viewModel.paidAmountText = String(format: "%.2f", cartViewModel.totalAmount)
                }
            }

            if viewModel.paymentType != .debt {
                HStack {
                    Text("To'langan summa ($):")
                        .font(.subheadline)
                    Spacer()
                    TextField("0.00", text: $viewModel.paidAmountText)
                        .keyboardType(.decimalPad)
                        .multilineTextAlignment(.trailing)
                        .textFieldStyle(.roundedBorder)
                        .frame(width: 120)
                }
            }

            let entered = Double(viewModel.paidAmountText) ?? 0.0
            let debtRemaining = cartViewModel.totalAmount - entered
            if debtRemaining > 0.01 || viewModel.paymentType == .debt {
                DatePicker("Qarz muddati", selection: $viewModel.dueDate, displayedComponents: .date)
            }
        }
    }

    private var summarySection: some View {
        let entered = Double(viewModel.paidAmountText) ?? 0.0
        let debtRemaining = max(0, cartViewModel.totalAmount - entered)

        return Section("Savdo hisoboti") {
            HStack {
                Text("Umumiy summa")
                Spacer()
                Text(cartViewModel.formattedTotal)
                    .fontWeight(.semibold)
            }

            HStack {
                Text("To'lanayotgan summa")
                Spacer()
                Text(APIConfig.formatMoney(entered))
                    .foregroundStyle(.green)
            }

            if debtRemaining > 0.01 {
                HStack {
                    Text("Qarz (Nasiya)")
                    Spacer()
                    Text(APIConfig.formatMoney(debtRemaining))
                        .foregroundStyle(.red)
                        .fontWeight(.bold)
                }
            }
        }
    }

    private func submitSale() {
        Task {
            let success = await viewModel.submitSale(
                cartLines: cartViewModel.lines,
                totalAmount: cartViewModel.totalAmount
            )
            if success, let sale = viewModel.completedSale {
                onSaleCompleted(sale)
                dismiss()
            }
        }
    }
}
