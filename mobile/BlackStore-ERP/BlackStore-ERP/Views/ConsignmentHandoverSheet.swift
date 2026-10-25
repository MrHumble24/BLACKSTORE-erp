import SwiftUI

/// Sheet for creating a new consignment handover to a partner shop (W4).
public struct ConsignmentHandoverSheet: View {
    @Environment(\.dismiss) private var dismiss
    @ObservedObject public var viewModel: ConsignmentsViewModel

    @State private var selectedPartner: Partner? = nil
    @State private var scannedCode: String = ""
    @State private var isLookingUp: Bool = false
    @State private var handoverItems: [(item: Item, minPrice: Double)] = []
    @State private var hasDueDate: Bool = false
    @State private var dueDate: Date = Calendar.current.date(byAdding: .day, value: 7, to: Date()) ?? Date()
    @State private var note: String = ""
    @State private var errorMessage: String? = nil

    public init(viewModel: ConsignmentsViewModel) {
        self.viewModel = viewModel
    }

    public var body: some View {
        NavigationStack {
            Form {
                partnerSection
                itemScanSection
                itemsListSection
                optionsSection
            }
            .navigationTitle("Yangi topshirish")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Bekor qilish") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Topshirish") { submitHandover() }
                        .disabled(selectedPartner == nil || handoverItems.isEmpty || viewModel.isLoading)
                }
            }
        }
    }

    private var partnerSection: some View {
        Section("Hamkor do'kon") {
            Picker("Hamkorni tanlang", selection: $selectedPartner) {
                Text("Tanlanmagan").tag(nil as Partner?)
                ForEach(viewModel.partners) { partner in
                    Text(partner.name).tag(partner as Partner?)
                }
            }
        }
    }

    private var itemScanSection: some View {
        Section("Mahsulot qo'shish") {
            HStack {
                TextField("IMEI / Shtrix-kod", text: $scannedCode)
                    .textFieldStyle(.roundedBorder)
                    .textInputAutocapitalization(.characters)
                    .autocorrectionDisabled()
                    .onSubmit { lookupItem() }

                Button(action: lookupItem) {
                    if isLookingUp {
                        ProgressView().controlSize(.small)
                    } else {
                        Text("Qidirish")
                    }
                }
                .buttonStyle(.borderedProminent)
                .disabled(scannedCode.trimmingCharacters(in: .whitespaces).isEmpty || isLookingUp)
            }

            if let err = errorMessage {
                Text(err)
                    .font(.caption2)
                    .foregroundStyle(.red)
            }
        }
    }

    private var itemsListSection: some View {
        Section("Topshiriladigan mahsulotlar (\(handoverItems.count))") {
            if handoverItems.isEmpty {
                Text("Hali hech narsa qo'shilmadi")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            } else {
                ForEach(handoverItems.indices, id: \.self) { idx in
                    handoverItemRow(at: idx)
                }
                .onDelete { indices in
                    handoverItems.remove(atOffsets: indices)
                }
            }
        }
    }

    private func handoverItemRow(at idx: Int) -> some View {
        let entry = handoverItems[idx]
        return VStack(alignment: .leading, spacing: 4) {
            Text(entry.item.productModel.name)
                .font(.headline)

            HStack {
                Text("Min narx ($):")
                    .font(.caption)
                    .foregroundStyle(.secondary)

                TextField("Min narx", value: Binding(
                    get: { handoverItems[idx].minPrice },
                    set: { handoverItems[idx].minPrice = $0 }
                ), format: .number)
                .keyboardType(.decimalPad)
                .textFieldStyle(.roundedBorder)
                .frame(width: 120)
            }
        }
    }

    private var optionsSection: some View {
        Section("Qo'shimcha sozlamalar") {
            Toggle("Qaytarish muddati bor", isOn: $hasDueDate)
            if hasDueDate {
                DatePicker("Muddat", selection: $dueDate, displayedComponents: .date)
            }
            TextField("Izoh (ixtiyoriy)", text: $note)
        }
    }

    private func lookupItem() {
        let clean = scannedCode.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !clean.isEmpty else { return }
        isLookingUp = true
        errorMessage = nil

        Task {
            do {
                let item: Item = try await APIClient.shared.get("/items/by-code/\(clean)")
                let basePrice = Double(item.minSalePrice ?? item.salePrice ?? "0") ?? 0
                handoverItems.append((item: item, minPrice: basePrice))
                scannedCode = ""
                isLookingUp = false
                HapticManager.selection()
            } catch {
                errorMessage = "Mahsulot topilmadi yoki omborda emas"
                isLookingUp = false
                HapticManager.error()
            }
        }
    }

    private func submitHandover() {
        guard let p = selectedPartner else { return }
        Task {
            let ok = await viewModel.handover(
                partnerId: p.id,
                items: handoverItems,
                dueDate: hasDueDate ? dueDate : nil,
                note: note
            )
            if ok {
                HapticManager.success()
                dismiss()
            }
        }
    }
}
