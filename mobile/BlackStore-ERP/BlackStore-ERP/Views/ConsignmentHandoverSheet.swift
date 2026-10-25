import SwiftUI

/// Sheet for handing devices over to a partner shop on consignment (W4).
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
    @State private var feedback: ScanFeedback? = nil
    @State private var isShowingScanner: Bool = false

    public init(viewModel: ConsignmentsViewModel) {
        self.viewModel = viewModel
    }

    private var isValid: Bool {
        selectedPartner != nil && !handoverItems.isEmpty && !viewModel.isLoading
    }

    public var body: some View {
        NavigationStack {
            Form {
                partnerSection
                itemScanSection
                itemsListSection
                optionsSection
                submitSection
            }
            .navigationTitle("Yangi topshirish")
            .navigationBarTitleDisplayMode(.inline)
            .keyboardDoneBar()
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Bekor qilish") { dismiss() }
                }
            }
            .sheet(isPresented: $isShowingScanner) {
                ScannerSheet(title: "Skanerlash", count: handoverItems.count, feedback: feedback) { code in
                    lookupItem(code: code)
                }
            }
            .onAppear { viewModel.errorMessage = nil }
        }
        .presentationDetents([.large])
        .presentationDragIndicator(.visible)
    }

    private var partnerSection: some View {
        Section("Hamkor do'kon") {
            Picker("Hamkor", selection: $selectedPartner) {
                Text("Tanlanmagan").tag(nil as Partner?)
                ForEach(viewModel.partners) { partner in
                    Text(partner.name).tag(partner as Partner?)
                }
            }
        }
    }

    private var itemScanSection: some View {
        Section {
            HStack {
                TextField("IMEI / Shtrix-kod", text: $scannedCode)
                    .textInputAutocapitalization(.characters)
                    .autocorrectionDisabled()
                    .submitLabel(.search)
                    .onSubmit { lookupItem(code: scannedCode) }
                Button { lookupItem(code: scannedCode) } label: {
                    if isLookingUp { ProgressView() } else { Text("Qidirish") }
                }
                .accessibilityLabel(isLookingUp ? "Qidirilmoqda" : "Qidirish")
                .buttonStyle(.bordered)
                .disabled(scannedCode.trimmingCharacters(in: .whitespaces).isEmpty || isLookingUp)
            }
            Button { isShowingScanner = true } label: {
                Label("Kamera bilan skanerlash", systemImage: "camera.viewfinder")
            }
            if let feedback {
                InlineMessage(text: "\(feedback.code): \(feedback.message)", isError: feedback.isError)
            }
        } header: {
            Text("Mahsulot qo'shish")
        } footer: {
            Text("Faqat omborda turgan mahsulotlarni topshirish mumkin.")
        }
    }

    private var itemsListSection: some View {
        Section("Topshiriladigan mahsulotlar (\(handoverItems.count))") {
            if handoverItems.isEmpty {
                Text("Hali hech narsa qo'shilmadi").foregroundStyle(.secondary)
            } else {
                ForEach(handoverItems.indices, id: \.self) { idx in
                    handoverItemRow(at: idx)
                }
                .onDelete { handoverItems.remove(atOffsets: $0) }
            }
        }
    }

    private func handoverItemRow(at idx: Int) -> some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(handoverItems[idx].item.productModel.name).font(.headline)
                LabeledContent("Min narx (\(APIConfig.currency))") {
                    TextField("Min narx", value: minPriceBinding(at: idx), format: .number)
                        .keyboardType(.decimalPad)
                        .multilineTextAlignment(.trailing)
                        .monospacedDigit()
                }
            }
            Button(role: .destructive) {
                handoverItems.remove(at: idx)
            } label: {
                Image(systemName: "trash").frame(minWidth: 44, minHeight: 44)
            }
            .buttonStyle(.borderless)
            .accessibilityLabel("O'chirish")
        }
    }

    /// Bounds-checked binding so deleting a row never reads a stale index.
    private func minPriceBinding(at idx: Int) -> Binding<Double> {
        Binding(
            get: { handoverItems.indices.contains(idx) ? handoverItems[idx].minPrice : 0 },
            set: { if handoverItems.indices.contains(idx) { handoverItems[idx].minPrice = $0 } }
        )
    }

    private var optionsSection: some View {
        Section("Qo'shimcha sozlamalar") {
            Toggle("Qaytarish muddati bor", isOn: $hasDueDate.animation())
            if hasDueDate {
                DatePicker("Muddat", selection: $dueDate, in: Date()..., displayedComponents: .date)
            }
            TextField("Izoh (ixtiyoriy)", text: $note, axis: .vertical)
        }
    }

    private var submitSection: some View {
        Section {
            if let err = viewModel.errorMessage {
                InlineMessage(text: err)
            }
            PrimaryButton(
                title: "Topshirish (\(handoverItems.count))",
                isBusy: viewModel.isLoading,
                action: submitHandover
            )
            .disabled(!isValid)
        }
    }

    /// Looks the code up and appends the item with its default minimum price.
    private func lookupItem(code: String) {
        let clean = code.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !clean.isEmpty else { return }
        isLookingUp = true

        Task {
            do {
                let item: Item = try await APIClient.shared.get("/items/by-code/\(clean)")
                if handoverItems.contains(where: { $0.item.id == item.id }) {
                    feedback = ScanFeedback(code: clean, message: "Ro'yxatga allaqachon qo'shilgan", isError: true)
                    HapticManager.warning()
                } else {
                    let basePrice = Double(item.minSalePrice ?? item.salePrice ?? "0") ?? 0
                    handoverItems.append((item: item, minPrice: basePrice))
                    feedback = ScanFeedback(code: clean, message: item.productModel.name, isError: false)
                    HapticManager.selection()
                }
                if scannedCode.trimmingCharacters(in: .whitespacesAndNewlines) == clean { scannedCode = "" }
            } catch {
                feedback = ScanFeedback(code: clean, message: "Mahsulot topilmadi yoki omborda emas", isError: true)
                HapticManager.error()
            }
            isLookingUp = false
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
            } else {
                HapticManager.error()
            }
        }
    }
}
