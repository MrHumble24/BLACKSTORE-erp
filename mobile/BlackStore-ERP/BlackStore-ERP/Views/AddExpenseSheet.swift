import SwiftUI

/// Sheet for logging a daily store expense or other income (FR-27).
public struct AddExpenseSheet: View {
    @Environment(\.dismiss) private var dismiss
    @ObservedObject public var viewModel: LedgerViewModel

    @State private var type: LedgerType = .expense
    @State private var category: String = "Transport"
    @State private var customCategory: String = ""
    @State private var amountText: String = ""
    @State private var inCash: Bool = true
    @State private var note: String = ""
    @State private var errorMessage: String? = nil
    @State private var isSaving = false

    /// Tag for the free-text category option.
    private static let otherTag = "Boshqa"

    public init(viewModel: LedgerViewModel) {
        self.viewModel = viewModel
    }

    public var body: some View {
        NavigationStack {
            Form {
                typeSection
                categorySection
                amountSection
                noteSection
            }
            .navigationTitle("Yangi kiritish")
            .navigationBarTitleDisplayMode(.inline)
            .peopleKeyboardDoneBar()
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Bekor qilish") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    if isSaving {
                        ProgressView()
                    } else {
                        Button("Saqlash") { submitEntry() }
                            .disabled(amount <= 0 || resolvedCategory.isEmpty)
                    }
                }
            }
            .onAppear(perform: selectValidCategory)
            .onChange(of: viewModel.categories) { selectValidCategory() }
        }
        .presentationDetents([.large])
        .presentationDragIndicator(.visible)
        .interactiveDismissDisabled(isSaving)
    }

    private var typeSection: some View {
        Section {
            Picker("Turi", selection: $type) {
                Text("Chiqim").tag(LedgerType.expense)
                Text("Kirim").tag(LedgerType.income)
            }
            .pickerStyle(.segmented)
        } footer: {
            Text(type == .expense ? "Do'kon xarajati (ijara, transport...)." : "Savdodan tashqari boshqa daromad.")
        }
    }

    private var categorySection: some View {
        Section("Kategoriya") {
            Picker("Tanlang", selection: $category) {
                ForEach(viewModel.categories.filter { $0 != Self.otherTag }, id: \.self) { cat in
                    Text(cat).tag(cat)
                }
                Text("Boshqa (qo'lda kiritish)").tag(Self.otherTag)
            }

            if category == Self.otherTag {
                TextField("Kategoriya nomini yozing", text: $customCategory)
            }
        }
    }

    private var amountSection: some View {
        Section {
            TextField("0.00", text: peopleDecimalBinding($amountText))
                .keyboardType(.decimalPad)
                .font(.title2.weight(.semibold))
                .monospacedDigit()
            Toggle("Kassa naqd pulidan", isOn: $inCash)
        } header: {
            Text("Miqdor ($)")
        } footer: {
            if let err = errorMessage {
                Text(err).foregroundStyle(.red)
            }
        }
    }

    private var noteSection: some View {
        Section("Izoh (ixtiyoriy)") {
            TextField("Kimga, nima uchun", text: $note)
        }
    }

    private var amount: Double { peopleParseAmount(amountText) ?? 0 }

    private var resolvedCategory: String {
        if category == Self.otherTag {
            return customCategory.trimmingCharacters(in: .whitespaces)
        }
        return category
    }

    /// Picks the first known category when the default is not in the server list.
    private func selectValidCategory() {
        if category != Self.otherTag && !viewModel.categories.contains(category) {
            category = viewModel.categories.first { $0 != Self.otherTag } ?? Self.otherTag
        }
    }

    private func submitEntry() {
        let cat = resolvedCategory
        guard !cat.isEmpty else {
            errorMessage = "Kategoriya kiritilishi shart"
            HapticManager.error()
            return
        }
        guard amount > 0 else {
            errorMessage = "Miqdor 0 dan katta bo'lishi kerak"
            HapticManager.error()
            return
        }
        errorMessage = nil
        isSaving = true

        Task {
            let ok = await viewModel.createEntry(type: type, category: cat, amount: amount, note: note, inCash: inCash)
            isSaving = false
            if ok {
                HapticManager.success()
                dismiss()
            } else {
                errorMessage = viewModel.errorMessage ?? "Saqlab bo'lmadi"
                HapticManager.error()
            }
        }
    }
}
