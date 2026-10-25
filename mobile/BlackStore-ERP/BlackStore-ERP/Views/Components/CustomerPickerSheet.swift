import SwiftUI

/// Sheet to search a customer by name or phone, or quickly register a new one.
public struct CustomerPickerSheet: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var viewModel = CustomerSearchViewModel()
    public let onSelect: (Customer) -> Void

    @State private var isShowingCreateForm: Bool = false

    public init(onSelect: @escaping (Customer) -> Void) {
        self.onSelect = onSelect
    }

    public var body: some View {
        NavigationStack {
            Group {
                if isShowingCreateForm {
                    QuickCustomerForm(viewModel: viewModel) { customer in
                        onSelect(customer)
                        dismiss()
                    }
                } else {
                    customerList
                }
            }
            // The form footer shows only the create error, never a stale search error.
            .onChange(of: isShowingCreateForm) { viewModel.errorMessage = nil }
            .navigationTitle(isShowingCreateForm ? "Yangi xaridor" : "Xaridorni tanlash")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(isShowingCreateForm ? "Orqaga" : "Yopish") {
                        if isShowingCreateForm { isShowingCreateForm = false } else { dismiss() }
                    }
                }
                if !isShowingCreateForm {
                    ToolbarItem(placement: .primaryAction) {
                        Button { isShowingCreateForm = true } label: {
                            Label("Yangi xaridor", systemImage: "person.badge.plus")
                        }
                    }
                }
            }
        }
        .presentationDetents([.large])
        .presentationDragIndicator(.visible)
    }

    private var customerList: some View {
        List {
            if viewModel.customers.isEmpty {
                Section { stateView }.listRowBackground(Color.clear)
            }
            ForEach(viewModel.customers) { customer in
                Button {
                    onSelect(customer)
                    dismiss()
                } label: {
                    CustomerPickerRow(customer: customer)
                }
            }
        }
        .listStyle(.insetGrouped)
        .searchable(text: $viewModel.searchText, prompt: "Ism yoki telefon...")
        .refreshable { await viewModel.search() }
        // Live search: restarts on each keystroke and waits briefly so we do not call the API per letter.
        .task(id: viewModel.searchText) {
            if !viewModel.searchText.isEmpty { try? await Task.sleep(for: .milliseconds(350)) }
            guard !Task.isCancelled else { return }
            await viewModel.search()
            // A newer keystroke cancelled this search; its "cancelled" error is not a real failure.
            if Task.isCancelled { viewModel.errorMessage = nil }
        }
    }

    @ViewBuilder
    private var stateView: some View {
        if viewModel.isLoading {
            ProgressView().frame(maxWidth: .infinity, minHeight: 120)
        } else if let err = viewModel.errorMessage {
            ErrorState(message: err) { await viewModel.search() }
        } else {
            MessagePanel(title: "Xaridor topilmadi", systemImage: "person.crop.circle.badge.questionmark") {
                Button("Yangi xaridor qo'shish") { isShowingCreateForm = true }
                    .buttonStyle(.borderedProminent)
            }
        }
    }
}

/// One customer row: name, phone and a red debt capsule when they owe money.
private struct CustomerPickerRow: View {
    let customer: Customer

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(customer.name).font(.body.weight(.medium)).foregroundStyle(.primary)
                Text(customer.phone).font(.caption).foregroundStyle(.secondary)
            }
            Spacer(minLength: 8)
            if let debt = customer.displayDebt {
                Text("Qarz: \(debt)")
                    .font(.caption.weight(.semibold))
                    .monospacedDigit()
                    .foregroundStyle(.red)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(Color.red.opacity(0.12), in: Capsule())
            }
        }
        .frame(minHeight: 44)
        .accessibilityElement(children: .combine)
    }
}

/// Name and phone form that registers a customer and selects them.
private struct QuickCustomerForm: View {
    @ObservedObject var viewModel: CustomerSearchViewModel
    let onCreated: (Customer) -> Void
    @FocusState private var focusedField: Field?

    private enum Field { case name, phone }

    private var isValid: Bool {
        !viewModel.newName.trimmingCharacters(in: .whitespaces).isEmpty
            && !viewModel.newPhone.trimmingCharacters(in: .whitespaces).isEmpty
    }

    var body: some View {
        Form {
            Section {
                TextField("F.I.SH", text: $viewModel.newName)
                    .textContentType(.name)
                    .focused($focusedField, equals: .name)
                    .submitLabel(.next)
                    .onSubmit { focusedField = .phone }
                TextField("Telefon raqami", text: $viewModel.newPhone)
                    .textContentType(.telephoneNumber)
                    .keyboardType(.phonePad)
                    .focused($focusedField, equals: .phone)
            } header: {
                Text("Xaridor ma'lumotlari")
            } footer: {
                if let err = viewModel.errorMessage {
                    Text(err).foregroundStyle(.red)
                }
            }
            Section {
                Button(action: save) {
                    Group {
                        if viewModel.isCreating { ProgressView() } else { Text("Xaridorni saqlash va tanlash") }
                    }
                    .font(.headline)
                    .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.large)
                .disabled(!isValid || viewModel.isCreating)
            }
            .listRowBackground(Color.clear)
            .listRowInsets(EdgeInsets())
        }
        .keyboardDoneBar()
        .onAppear { focusedField = .name }
    }

    private func save() {
        Task {
            if let customer = await viewModel.quickRegister() { onCreated(customer) }
        }
    }
}
