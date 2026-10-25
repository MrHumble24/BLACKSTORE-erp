import SwiftUI

/// Batch detail with rapid continuous device scanning into the batch (FR-14, FR-16).
public struct BatchDetailView: View {
    public let batchId: Int
    @ObservedObject public var parentVM: BatchesViewModel

    @State private var detail: BatchDetail? = nil
    @State private var isLoading: Bool = false
    @State private var loadError: String? = nil
    @State private var selectedModel: ProductModel? = nil
    @State private var imeiInput: String = ""
    @State private var serialInput: String = ""
    @State private var defaultPurchasePrice: Double = 0
    @State private var isShowingCamera: Bool = false
    @State private var isAddingItem: Bool = false
    @State private var modelWarning: Bool = false
    @State private var feedback: ScanFeedback? = nil
    @State private var sessionScanCount: Int = 0
    @State private var isShowingLabels: Bool = false

    public init(batchId: Int, parentVM: BatchesViewModel) {
        self.batchId = batchId
        self.parentVM = parentVM
    }

    private var lines: [BatchLine] { detail?.lines ?? [] }
    /// Labels are for devices only; accessory lines carry no item.
    private var hasDevices: Bool { lines.contains { $0.item != nil } }

    public var body: some View {
        content
            .navigationTitle("Partiya #\(batchId)")
            .navigationBarTitleDisplayMode(.inline)
            .task { await loadDetail() }
            .refreshable { await loadDetail() }
            .onAppear {
                if selectedModel == nil { selectedModel = parentVM.models.first }
            }
            .onChange(of: parentVM.models) { _, models in
                if selectedModel == nil { selectedModel = models.first }
            }
            .keyboardDoneBar()
            // This screen is reached only from the receive_batch-gated batches list, so no extra check here.
            .toolbar {
                if hasDevices {
                    ToolbarItem(placement: .primaryAction) {
                        Button { isShowingLabels = true } label: {
                            Label("Yorliqlar", systemImage: "printer")
                        }
                    }
                }
            }
            .sheet(isPresented: $isShowingLabels) { BatchLabelsSheet(batchId: batchId) }
            .sheet(isPresented: $isShowingCamera, onDismiss: { feedback = nil }) {
                ScannerSheet(title: "IMEI skanerlash", count: sessionScanCount, feedback: feedback) { code in
                    submitDevice(code: code)
                }
            }
    }

    @ViewBuilder
    private var content: some View {
        if isLoading && detail == nil {
            LoadingState()
        } else if let detail {
            List {
                headerSection(for: detail)
                receiveSection
                linesSection
            }
            .listStyle(.insetGrouped)
        } else {
            ErrorState(title: "Partiya yuklanmadi", systemImage: "exclamationmark.triangle", message: loadError ?? "Ma'lumot topilmadi") { await loadDetail() }
        }
    }

    private func headerSection(for d: BatchDetail) -> some View {
        Section("Partiya ma'lumotlari") {
            LabeledContent("Yetkazib beruvchi", value: d.supplier?.name ?? "—")
            if let inv = d.investor {
                LabeledContent("Mulkdor / Investor", value: "\(inv.name) (\(inv.code))")
            }
            LabeledContent("Qabul ombori", value: d.location?.name ?? "—")
            if let date = d.arrivalDate {
                LabeledContent("Yetib kelgan sana", value: date)
            }
            if let note = d.note, !note.isEmpty {
                LabeledContent("Izoh", value: note)
            }
        }
    }

    private var receiveSection: some View {
        Section {
            Picker("Model", selection: $selectedModel) {
                if parentVM.models.isEmpty {
                    Text("Modellar yuklanmoqda…").tag(nil as ProductModel?)
                } else {
                    Text("Tanlanmagan").tag(nil as ProductModel?)
                    ForEach(parentVM.models) { mod in
                        Text(mod.name).tag(mod as ProductModel?)
                    }
                }
            }
            .onChange(of: selectedModel) { _, newModel in
                if newModel != nil { modelWarning = false }
            }

            priceField("Tan narxi (ixtiyoriy)", value: $defaultPurchasePrice)
            imeiRow

            if selectedModel == nil {
                InlineMessage(text: "Qurilmani qabul qilish uchun avval yuqoridan modelni tanlang", isError: modelWarning)
            }
            if let feedback {
                InlineMessage(text: "\(feedback.code): \(feedback.message)", isError: feedback.isError)
            }

            PrimaryButton(title: "Kamera bilan skanerlash", systemImage: "camera.viewfinder") {
                if selectedModel == nil {
                    modelWarning = true
                    HapticManager.warning()
                } else {
                    modelWarning = false
                    isShowingCamera = true
                }
            }
        } header: {
            Text("Tezkor qabul qilish")
        } footer: {
            Text("Modelni tanlang, so'ng qurilmalarni ketma-ket skanerlang.")
        }
    }

    private func priceField(_ title: String, value: Binding<Double>) -> some View {
        LabeledContent("\(title) (\(APIConfig.currency))") {
            TextField("0.00", value: value, format: .number)
                .keyboardType(.decimalPad)
                .multilineTextAlignment(.trailing)
                .monospacedDigit()
        }
    }

    private var imeiRow: some View {
        HStack {
            TextField("IMEI raqami", text: $imeiInput)
                .keyboardType(.numberPad)
                .textContentType(.none)
                .monospacedDigit()
                .onSubmit { submitDevice(code: imeiInput) }
            Button {
                submitDevice(code: imeiInput)
            } label: {
                if isAddingItem { ProgressView() } else { Text("Qabul") }
            }
            .accessibilityLabel(isAddingItem ? "Qabul qilinmoqda" : "Qabul")
            .buttonStyle(.borderedProminent)
            .disabled(imeiInput.trimmingCharacters(in: .whitespaces).isEmpty || isAddingItem)
        }
    }

    @ViewBuilder
    private var linesSection: some View {
        if !lines.isEmpty {
            Section("Qabul qilingan mahsulotlar (\(lines.count))") {
                ForEach(lines) { line in
                    BatchLineRow(line: line)
                }
            }
        }
    }

    /// Adds one device by IMEI (typed or scanned) and records the outcome for the scanner panel.
    private func submitDevice(code: String) {
        guard !isAddingItem else { return }
        guard let model = selectedModel else {
            modelWarning = true
            HapticManager.warning()
            return
        }
        let cleanImei = code.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !cleanImei.isEmpty else { return }

        isAddingItem = true
        Task {
            let ok = await parentVM.addDevice(
                batchId: batchId,
                modelId: model.id,
                imei: cleanImei,
                serial: serialInput.isEmpty ? nil : serialInput,
                purchasePrice: defaultPurchasePrice > 0 ? defaultPurchasePrice : nil
            )
            isAddingItem = false
            if ok {
                sessionScanCount += 1
                feedback = ScanFeedback(code: cleanImei, message: "\(model.name) qabul qilindi", isError: false)
                if imeiInput.trimmingCharacters(in: .whitespacesAndNewlines) == cleanImei { imeiInput = "" }
                serialInput = ""
                await loadDetail()
            } else {
                feedback = ScanFeedback(code: cleanImei, message: parentVM.errorMessage ?? "Xatolik", isError: true)
            }
            parentVM.errorMessage = nil
            parentVM.successMessage = nil
        }
    }

    private func loadDetail() async {
        isLoading = true
        if parentVM.models.isEmpty {
            await parentVM.loadPrerequisites()
            if selectedModel == nil {
                selectedModel = parentVM.models.first
            }
        }
        do {
            detail = try await parentVM.fetchDetail(id: batchId)
            loadError = nil
        } catch {
            loadError = error.localizedDescription
            HapticManager.error()
        }
        isLoading = false
    }
}

/// One received device: model, identifier and its sale / minimum price.
private struct BatchLineRow: View {
    let line: BatchLine

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(line.displayTitle).font(.headline)
            if let item = line.item {
                Text(item.primaryIdentifier)
                    .font(.caption.monospaced())
                    .foregroundStyle(.secondary)
            }
            HStack(spacing: 12) {
                if let sale = line.salePrice {
                    Text("Sotuv: \(APIConfig.formatMoney(sale))")
                }
                if let min = line.minSalePrice {
                    Text("Min: \(APIConfig.formatMoney(min))").foregroundStyle(.secondary)
                }
            }
            .font(.subheadline)
            .monospacedDigit()
        }
        .padding(.vertical, 2)
        .accessibilityElement(children: .combine)
    }
}
