import SwiftUI

/// Customer CRM and Debt Directory view.
public struct CustomersView: View {
    @StateObject private var viewModel = CustomerListViewModel()
    @State private var showingAddCustomerSheet: Bool = false

    public init() {}

    public var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                filterPicker

                if viewModel.isLoading && viewModel.customers.isEmpty {
                    Spacer()
                    ProgressView("Xaridorlar yuklanmoqda...")
                    Spacer()
                } else if viewModel.customers.isEmpty {
                    emptyStateView
                } else {
                    customerListView
                }
            }
            .navigationTitle("Xaridorlar")
            .searchable(text: $viewModel.searchText, prompt: "Ism yoki telefon raqami...")
            .onChange(of: viewModel.searchText) {
                Task { await viewModel.fetchCustomers() }
            }
            .onChange(of: viewModel.filterDebtOnly) {
                Task { await viewModel.fetchCustomers() }
            }
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        showingAddCustomerSheet = true
                    } label: {
                        Image(systemName: "person.crop.circle.badge.plus")
                    }
                }
            }
            .sheet(isPresented: $showingAddCustomerSheet) {
                CustomerPickerSheet { _ in
                    Task { await viewModel.fetchCustomers() }
                }
            }
            .task {
                await viewModel.fetchCustomers()
            }
        }
    }

    private var filterPicker: some View {
        Picker("Filter", selection: $viewModel.filterDebtOnly) {
            Text("Barchasi").tag(false)
            Text("Qarzdorlar (Nasiya)").tag(true)
        }
        .pickerStyle(.segmented)
        .padding(.horizontal)
        .padding(.vertical, 8)
    }

    private var customerListView: some View {
        List(viewModel.customers) { customer in
            NavigationLink {
                CustomerDetailView(customerId: customer.id)
            } label: {
                customerRow(customer: customer)
            }
        }
        .listStyle(.plain)
        .refreshable {
            await viewModel.fetchCustomers()
        }
    }

    private func customerRow(customer: Customer) -> some View {
        HStack(spacing: 12) {
            Circle()
                .fill(Color.accentColor.opacity(0.15))
                .frame(width: 44, height: 44)
                .overlay {
                    Text(String(customer.name.prefix(1)).uppercased())
                        .font(.headline)
                        .foregroundStyle(Color.accentColor)
                }

            VStack(alignment: .leading, spacing: 4) {
                Text(customer.name)
                    .font(.headline)

                Text(customer.phone)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            if let debt = customer.displayDebt {
                VStack(alignment: .trailing, spacing: 2) {
                    Text(debt)
                        .font(.subheadline)
                        .fontWeight(.bold)
                        .foregroundStyle(.red)

                    Text("Qarz")
                        .font(.caption2)
                        .foregroundStyle(.red)
                }
            }
        }
        .padding(.vertical, 4)
    }

    private var emptyStateView: some View {
        VStack(spacing: 12) {
            Spacer()
            Image(systemName: "person.2.slash")
                .font(.system(size: 48))
                .foregroundStyle(.secondary)
            Text(viewModel.filterDebtOnly ? "Qarzdor xaridorlar topilmadi" : "Xaridorlar topilmadi")
                .font(.headline)
                .foregroundStyle(.secondary)
            Spacer()
        }
    }
}
