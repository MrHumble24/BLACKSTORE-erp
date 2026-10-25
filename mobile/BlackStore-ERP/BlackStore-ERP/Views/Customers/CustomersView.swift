import SwiftUI

/// Customer directory with debt filter, search and quick add (Xaridorlar tab).
public struct CustomersView: View {
    @StateObject private var viewModel = CustomerListViewModel()
    @State private var showingAddCustomerSheet: Bool = false

    public init() {}

    public var body: some View {
        NavigationStack {
            content
                .navigationTitle("Xaridorlar")
                .searchable(text: $viewModel.searchText, prompt: "Ism yoki telefon raqami")
                .safeAreaInset(edge: .top, spacing: 0) { filterPicker }
                .task(id: reloadKey) { await reload() }
                .toolbar {
                    ToolbarItem(placement: .primaryAction) {
                        Button {
                            showingAddCustomerSheet = true
                        } label: {
                            Label("Yangi xaridor", systemImage: "person.crop.circle.badge.plus")
                        }
                    }
                }
                .sheet(isPresented: $showingAddCustomerSheet) {
                    CustomerPickerSheet { _ in
                        Task { await viewModel.fetchCustomers() }
                    }
                    .presentationDetents([.large])
                    .presentationDragIndicator(.visible)
                }
        }
    }

    /// Search text and filter together; any change reloads the list.
    private var reloadKey: String { "\(viewModel.filterDebtOnly)|\(viewModel.searchText)" }

    /// Waits briefly while the user is still typing, then fetches.
    private func reload() async {
        if !viewModel.searchText.isEmpty {
            do { try await Task.sleep(for: .milliseconds(300)) } catch { return }
        }
        await viewModel.fetchCustomers()
        // A newer keystroke cancelled this load; its "cancelled" error is not a real failure.
        if Task.isCancelled { viewModel.errorMessage = nil }
    }

    @ViewBuilder
    private var content: some View {
        if viewModel.isLoading && viewModel.customers.isEmpty {
            PeopleLoadingState()
        } else if let err = viewModel.errorMessage, viewModel.customers.isEmpty {
            PeopleErrorState(message: err) { await viewModel.fetchCustomers() }
        } else if viewModel.customers.isEmpty {
            emptyState
        } else {
            customerList
        }
    }

    private var filterPicker: some View {
        Picker("Filtr", selection: $viewModel.filterDebtOnly) {
            Text("Barchasi").tag(false)
            Text("Qarzdorlar").tag(true)
        }
        .pickerStyle(.segmented)
        .padding(.horizontal)
        .padding(.vertical, 8)
        .background(.bar)
    }

    private var customerList: some View {
        List {
            if let err = viewModel.errorMessage {
                PeopleInlineError(message: err)
            }
            Section {
                ForEach(viewModel.customers) { customer in
                    NavigationLink {
                        CustomerDetailView(customerId: customer.id)
                    } label: {
                        CustomerRow(customer: customer)
                    }
                }
            }
        }
        .listStyle(.insetGrouped)
        .refreshable { await viewModel.fetchCustomers() }
    }

    @ViewBuilder
    private var emptyState: some View {
        if !viewModel.searchText.isEmpty {
            ContentUnavailableView.search(text: viewModel.searchText)
        } else {
            ContentUnavailableView(
                viewModel.filterDebtOnly ? "Qarzdor xaridorlar yo'q" : "Xaridorlar topilmadi",
                systemImage: "person.2.slash",
                description: Text(viewModel.filterDebtOnly ? "Hech kim qarzdor emas." : "Yangi xaridor qo'shish uchun + tugmasini bosing.")
            )
        }
    }
}

/// One customer in the directory: initial, name, phone and debt if any.
private struct CustomerRow: View {
    let customer: Customer

    var body: some View {
        HStack(spacing: 12) {
            Text(String(customer.name.prefix(1)).uppercased())
                .font(.headline)
                .foregroundStyle(.tint)
                .frame(width: 44, height: 44)
                .background(Color.accentColor.opacity(0.15), in: Circle())
                .accessibilityHidden(true)

            VStack(alignment: .leading, spacing: 2) {
                Text(customer.name).font(.headline)
                Text(customer.phone)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            Spacer(minLength: 8)

            if let debt = customer.displayDebt {
                VStack(alignment: .trailing, spacing: 2) {
                    Text(debt)
                        .font(.subheadline.weight(.bold))
                        .monospacedDigit()
                    Text("Qarz").font(.caption)
                }
                .foregroundStyle(.red)
            }
        }
        .padding(.vertical, 2)
        .accessibilityElement(children: .combine)
    }
}
