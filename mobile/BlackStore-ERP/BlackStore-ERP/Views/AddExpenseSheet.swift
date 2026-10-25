import SwiftUI

/// Sheet for logging a daily store expense or other income (FR-27).
public struct AddExpenseSheet: View {
    @Environment(\.dismiss) private var dismiss
    @ObservedObject public var viewModel: LedgerViewModel

    @State private var type: LedgerType = .expense
    @State private var category: String = "Transport"
    @State private var customCategory: String = ""
    @State private var amount: Double = 0
    @State private var inCash: Bool = true
    @State private var note: String = ""
    @State private var errorMessage: String? = nil

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
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Bekor qilish") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Saqlash") { submitEntry() }
                        .disabled(amount <= 0 || resolvedCategory.isEmpty || viewModel.isLoading)
                }
            }
        }
    }

    private var typeSection: some View {
        Section("Yozuv turi") {
            Picker("Turi", selection: $type) {
                Text("Chiqim (Xarajat)").tag(LedgerType.expense)
                Text("Kirim (Boshqa daromad)").tag(LedgerType.income)
            }
            .pickerStyle(.segmented)
        }
    }

    private var categorySection: some View {
        Section("Kategoriya") {
            Picker("Tanlang", selection: $category) {
                ForEach(viewModel.categories, id: \.self) { cat in
                    Text(cat).tag(cat)
                }
                Text("Boshqa (Qo'lda kiritish)").tag("Boshqa")
            }

            if category == "Boshqa" {
                TextField("Kategoriya nomini yozing", text: $customCategory)
            }
        }
    }

    private var amountSection: some View {
        Section("Miqdor va to'lov turi") {
            HStack {
                Text("Miqdor ($):")
                TextField("0.00", value: $amount, format: .number)
                    .keyboardType(.decimalPad)
                    .textFieldStyle(.roundedBorder)
            }

            Toggle("Kassa naqd pulidan to'landi", isOn: $inCash)

            if let err = errorMessage {
                Text(err)
                    .font(.caption2)
                    .foregroundStyle(.red)
            }
        }
    }

    private var noteSection: some View {
        Section("Qo'shimcha izoh") {
            TextField("Izoh (kimga, nima uchun)", text: $note)
        }
    }

    private var resolvedCategory: String {
        if category == "Boshqa" {
            return customCategory.trimmingCharacters(in: .whitespaces)
        }
        return category
    }

    private func submitEntry() {
        let cat = resolvedCategory
        guard !cat.isEmpty else {
            errorMessage = "Kategoriya kiritilishi shart"
            return
        }
        guard amount > 0 else {
            errorMessage = "Miqdor 0 dan katta bo'lishi kerak"
            return
        }

        Task {
            let ok = await viewModel.createEntry(
                type: type,
                category: cat,
                amount: amount,
                note: note,
                inCash: inCash
            )
            if ok {
                HapticManager.success()
                dismiss()
            }
        }
    }
}
