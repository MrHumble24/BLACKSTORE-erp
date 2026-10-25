import SwiftUI

/// Modal sheet for searching or quick-registering a customer for checkout.
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
            VStack(spacing: 0) {
                if isShowingCreateForm {
                    createCustomerSection
                } else {
                    customerListSection
                }
            }
            .navigationTitle(isShowingCreateForm ? "Yangi xaridor" : "Xaridorni tanlash")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(isShowingCreateForm ? "Orqaga" : "Yopish") {
                        if isShowingCreateForm {
                            isShowingCreateForm = false
                        } else {
                            dismiss()
                        }
                    }
                }

                if !isShowingCreateForm {
                    ToolbarItem(placement: .primaryAction) {
                        Button {
                            isShowingCreateForm = true
                        } label: {
                            Image(systemName: "person.badge.plus")
                        }
                    }
                }
            }
            .task {
                await viewModel.search()
            }
        }
    }

    private var customerListSection: some View {
        List {
            ForEach(viewModel.customers) { customer in
                Button {
                    onSelect(customer)
                    dismiss()
                } label: {
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(customer.name)
                                .font(.body)
                                .fontWeight(.medium)
                                .foregroundStyle(.primary)

                            Text(customer.phone)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }

                        Spacer()

                        if let debt = customer.displayDebt {
                            Text("Qarz: \(debt)")
                                .font(.caption)
                                .fontWeight(.semibold)
                                .foregroundStyle(.red)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 4)
                                .background(Color.red.opacity(0.1))
                                .clipShape(Capsule())
                        }
                    }
                }
            }
        }
        .listStyle(.insetGrouped)
        .searchable(text: $viewModel.searchText, prompt: "Ism yoki telefon...")
        .onSubmit(of: .search) {
            Task { await viewModel.search() }
        }
    }

    private var createCustomerSection: some View {
        Form {
            Section("Xaridor ma'lumotlari") {
                TextField("F.I.SH", text: $viewModel.newName)
                TextField("Telefon raqami", text: $viewModel.newPhone)
                    .keyboardType(.phonePad)
            }

            if let err = viewModel.errorMessage {
                Text(err)
                    .font(.caption)
                    .foregroundStyle(.red)
            }

            Button {
                Task {
                    if let customer = await viewModel.quickRegister() {
                        onSelect(customer)
                        dismiss()
                    }
                }
            } label: {
                if viewModel.isCreating {
                    ProgressView()
                } else {
                    Text("Xaridorni saqlash va tanlash")
                        .frame(maxWidth: .infinity)
                }
            }
            .buttonStyle(.borderedProminent)
            .disabled(viewModel.newName.isEmpty || viewModel.newPhone.isEmpty || viewModel.isCreating)
        }
    }
}
