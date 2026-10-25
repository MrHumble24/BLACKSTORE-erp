import SwiftUI

/// Checkout sheet: branch, payment type, customer, warranty, then complete the sale.
public struct CheckoutView: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var viewModel = CheckoutViewModel()
    @ObservedObject public var cartViewModel: CartViewModel
    public let onSaleCompleted: (Sale) -> Void

    @State private var isShowingCustomerPicker = false
    @State private var isLoadingLocations = true

    public init(
        cartViewModel: CartViewModel,
        onSaleCompleted: @escaping (Sale) -> Void
    ) {
        self.cartViewModel = cartViewModel
        self.onSaleCompleted = onSaleCompleted
    }

    /// Money still owed after the entered payment; a debt needs a customer.
    private var debtRemaining: Double {
        max(0, cartViewModel.totalAmount - (Double(viewModel.paidAmountText) ?? 0))
    }

    private var needsCustomer: Bool {
        viewModel.paymentType == .debt || debtRemaining > 0.01
    }

    private var canSubmit: Bool {
        !viewModel.isSubmitting && cartViewModel.allPricesValid && viewModel.selectedLocation != nil
            && !(needsCustomer && viewModel.selectedCustomer == nil)
    }

    public var body: some View {
        NavigationStack {
            Form {
                CheckoutPaymentSection(viewModel: viewModel, total: cartViewModel.totalAmount, showsDueDate: needsCustomer)
                CheckoutCustomerSection(customer: viewModel.selectedCustomer, isRequired: needsCustomer) {
                    isShowingCustomerPicker = true
                }
                CheckoutDetailsSection(viewModel: viewModel, isLoading: isLoadingLocations, onRetry: loadLocations)
                CheckoutSummarySection(total: cartViewModel.totalAmount, paidText: viewModel.paidAmountText, debt: debtRemaining)
                if let err = viewModel.errorMessage {
                    Section {
                        Label(err, systemImage: "exclamationmark.triangle.fill").foregroundStyle(.red)
                    }
                }
            }
            .navigationTitle("To'lov")
            .navigationBarTitleDisplayMode(.inline)
            .salesKeyboardDoneBar()
            .safeAreaInset(edge: .bottom) {
                SalesBottomBar(
                    title: "Savdoni yakunlash · \(cartViewModel.formattedTotal)",
                    isBusy: viewModel.isSubmitting,
                    isDisabled: !canSubmit,
                    action: submitSale
                )
            }
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Bekor qilish") { dismiss() }
                }
            }
            .sheet(isPresented: $isShowingCustomerPicker) {
                CustomerPickerSheet { customer in viewModel.selectedCustomer = customer }
            }
            .task {
                // prepare() resets errorMessage, so it runs first to keep a branch-load error visible.
                viewModel.prepare(for: cartViewModel.totalAmount)
                await loadLocations()
            }
        }
        .presentationDetents([.large])
        .presentationDragIndicator(.visible)
        .interactiveDismissDisabled(viewModel.isSubmitting)
    }

    /// Loads branches and tracks loading so the picker can show a spinner or an empty state.
    private func loadLocations() async {
        isLoadingLocations = true
        await viewModel.fetchLocations()
        isLoadingLocations = false
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
