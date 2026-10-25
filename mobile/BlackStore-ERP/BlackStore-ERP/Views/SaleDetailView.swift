import SwiftUI

/// One sale in detail: amount owed or paid, items with returns, payments and returns history.
public struct SaleDetailView: View {
    @StateObject private var viewModel: SaleDetailViewModel
    @State private var lineToReturn: SaleLine? = nil
    @State private var isShowingPaymentSheet: Bool = false

    public init(sale: Sale) {
        _viewModel = StateObject(wrappedValue: SaleDetailViewModel(sale: sale))
    }

    private var debt: Double? { SalesFormat.debt(of: viewModel.sale) }
    private var isSheetOpen: Bool { isShowingPaymentSheet || lineToReturn != nil }

    public var body: some View {
        List {
            SaleHeadlineSection(sale: viewModel.sale, debt: debt)
            if let err = viewModel.errorMessage, !isSheetOpen {
                Section {
                    Label(err, systemImage: "exclamationmark.triangle.fill").foregroundStyle(.red)
                    Button("Qayta urinish") { Task { await viewModel.fetchSale() } }
                }
            }
            SaleSummarySection(sale: viewModel.sale)
            SaleItemsSection(items: viewModel.sale.items ?? []) { lineToReturn = $0 }
            SalePaymentsSection(payments: viewModel.sale.payments ?? [])
            if let returns = viewModel.sale.returns, !returns.isEmpty {
                SaleReturnsSection(returns: returns)
            }
        }
        .listStyle(.insetGrouped)
        .navigationTitle("Savdo #\(viewModel.sale.id)")
        .navigationBarTitleDisplayMode(.inline)
        .safeAreaInset(edge: .bottom) {
            if debt != nil {
                SalesBottomBar(title: "Nasiya to'lovini qabul qilish", systemImage: "creditcard.and.123", isDisabled: false) {
                    isShowingPaymentSheet = true
                }
            }
        }
        .toolbar {
            if viewModel.isLoading {
                ToolbarItem(placement: .primaryAction) { ProgressView() }
            }
        }
        .refreshable { await viewModel.fetchSale() }
        .task { await viewModel.fetchSale() }
        // A sheet's error must not linger on the detail screen after it closes.
        .sheet(item: $lineToReturn, onDismiss: { viewModel.errorMessage = nil }) { line in
            ProcessReturnSheet(viewModel: viewModel, line: line)
        }
        .sheet(isPresented: $isShowingPaymentSheet, onDismiss: { viewModel.errorMessage = nil }) {
            RecordPaymentSheet(viewModel: viewModel)
        }
    }
}
