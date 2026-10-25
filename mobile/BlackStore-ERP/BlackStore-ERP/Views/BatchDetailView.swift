import SwiftUI

/// Detailed batch view featuring rapid continuous device scanning (FR-14, FR-16).
public struct BatchDetailView: View {
    public let batchId: Int
    @ObservedObject public var parentVM: BatchesViewModel

    @State private var detail: BatchDetail? = nil
    @State private var isLoading: Bool = false
    @State private var selectedModel: ProductModel? = nil
    @State private var imeiInput: String = ""
    @State private var serialInput: String = ""
    @State private var defaultSalePrice: Double = 0
    @State private var defaultMinPrice: Double = 0
    @State private var isShowingCamera: Bool = false
    @State private var isAddingItem: Bool = false

    public init(batchId: Int, parentVM: BatchesViewModel) {
        self.batchId = batchId
        self.parentVM = parentVM
    }

    public var body: some View {
        List {
            if let d = detail {
                headerSection(for: d)
            }

            continuousScanSection

            if let lines = detail?.lines, !lines.isEmpty {
                Section("Qabul qilingan mahsulotlar (\(lines.count))") {
                    ForEach(lines) { line in
                        lineRow(for: line)
                    }
                }
            }
        }
        .listStyle(.insetGrouped)
        .navigationTitle("Partiya #\(batchId)")
        .navigationBarTitleDisplayMode(.inline)
        .task { await loadDetail() }
        .sheet(isPresented: $isShowingCamera) {
            NavigationStack {
                VisionScannerView { code in
                    imeiInput = code
                    isShowingCamera = false
                    submitScannedDevice()
                }
                .navigationTitle("IMEI skanerlash")
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) {
                        Button("Yopish") { isShowingCamera = false }
                    }
                }
            }
        }
    }

    private func headerSection(for d: BatchDetail) -> some View {
        Section("Partiya ma'lumotlari") {
            LabeledContent("Yetkazib beruvchi", value: d.supplier.name)
            LabeledContent("Qabul ombori", value: d.location.name)
            if let date = d.arrivalDate {
                LabeledContent("Yetib kelgan sana", value: date)
            }
            if let track = d.trackingNumber {
                LabeledContent("Trek raqam", value: track)
            }
        }
    }

    private var continuousScanSection: some View {
        Section("Tezkor skanerlash (Bir necha qurilma)") {
            Picker("Modelni tanlang", selection: $selectedModel) {
                Text("Model tanlanmagan").tag(nil as ProductModel?)
                ForEach(parentVM.models) { mod in
                    Text(mod.name).tag(mod as ProductModel?)
                }
            }

            HStack {
                Text("Sotuv narxi ($):")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                TextField("0.00", value: $defaultSalePrice, format: .number)
                    .keyboardType(.decimalPad)
                    .textFieldStyle(.roundedBorder)

                Text("Min narx ($):")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                TextField("0.00", value: $defaultMinPrice, format: .number)
                    .keyboardType(.decimalPad)
                    .textFieldStyle(.roundedBorder)
            }

            HStack {
                TextField("IMEI raqamini kiriting", text: $imeiInput)
                    .textFieldStyle(.roundedBorder)
                    .textInputAutocapitalization(.characters)
                    .keyboardType(.numberPad)
                    .onSubmit { submitScannedDevice() }

                Button {
                    isShowingCamera = true
                } label: {
                    Image(systemName: "camera.fill")
                }
                .buttonStyle(.bordered)

                Button(action: submitScannedDevice) {
                    if isAddingItem {
                        ProgressView().controlSize(.small)
                    } else {
                        Text("Qabul")
                    }
                }
                .buttonStyle(.borderedProminent)
                .disabled(selectedModel == nil || imeiInput.trimmingCharacters(in: .whitespaces).isEmpty || isAddingItem)
            }
        }
    }

    private func lineRow(for line: BatchLine) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(line.displayTitle)
                .font(.headline)

            if let item = line.item {
                Text(item.primaryIdentifier)
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }

            HStack {
                if let sale = line.salePrice {
                    Text("Sotuv: \(APIConfig.formatMoney(sale))")
                        .font(.caption)
                        .foregroundStyle(.green)
                }
                if let min = line.minSalePrice {
                    Text("Min: \(APIConfig.formatMoney(min))")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
        }
        .padding(.vertical, 2)
    }

    private func submitScannedDevice() {
        guard let model = selectedModel else { return }
        let cleanImei = imeiInput.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !cleanImei.isEmpty else { return }

        isAddingItem = true
        Task {
            let ok = await parentVM.addDevice(
                batchId: batchId,
                modelId: model.id,
                imei: cleanImei,
                serial: serialInput.isEmpty ? nil : serialInput,
                salePrice: defaultSalePrice > 0 ? defaultSalePrice : nil,
                minSalePrice: defaultMinPrice > 0 ? defaultMinPrice : nil
            )
            isAddingItem = false
            if ok {
                imeiInput = ""
                serialInput = ""
                await loadDetail()
            }
        }
    }

    private func loadDetail() async {
        isLoading = true
        do {
            self.detail = try await parentVM.fetchDetail(id: batchId)
            self.isLoading = false
        } catch {
            self.isLoading = false
        }
    }
}
