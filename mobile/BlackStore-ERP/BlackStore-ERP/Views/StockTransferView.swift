import SwiftUI

/// Moves devices between branches: pick the route, scan devices, confirm (PRD FR-5, W6).
public struct StockTransferView: View {
    @StateObject private var viewModel = StockTransferViewModel()
    @State private var isShowingScanner: Bool = false
    @State private var manualInput: String = ""
    @State private var feedback: ScanFeedback? = nil

    public init() {}

    private var isSameRoute: Bool {
        guard let from = viewModel.fromLocation, let to = viewModel.toLocation else { return false }
        return from.id == to.id
    }

    public var body: some View {
        Form {
            locationSection
            inputSection
            scannedDevicesSection
            noteSection
            submitSection
            if !viewModel.recentTransfers.isEmpty {
                RecentTransfersSection(transfers: viewModel.recentTransfers)
            }
        }
        .navigationTitle("Filiallararo ko'chirish")
        .navigationBarTitleDisplayMode(.inline)
        .keyboardDoneBar()
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button { isShowingScanner = true } label: {
                    Label("Skanerlash", systemImage: "camera.viewfinder")
                }
            }
        }
        .sheet(isPresented: $isShowingScanner) {
            ScannerSheet(title: "Skanerlash", count: viewModel.scannedItems.count, feedback: feedback) { code in
                scan(code)
            }
        }
        .task {
            await viewModel.loadLocations()
            await viewModel.fetchRecentTransfers()
        }
        .refreshable { await viewModel.fetchRecentTransfers() }
    }

    private var locationSection: some View {
        Section {
            Picker("Qayerdan", selection: $viewModel.fromLocation) {
                ForEach(viewModel.locations) { loc in
                    Text(loc.name).tag(Optional(loc))
                }
            }
            Picker("Qayerga", selection: $viewModel.toLocation) {
                ForEach(viewModel.locations) { loc in
                    Text(loc.name).tag(Optional(loc))
                }
            }
        } header: {
            Text("Yo'nalish")
        } footer: {
            if isSameRoute {
                Text("Jo'natuvchi va qabul qiluvchi filial bir xil bo'lmasin.").foregroundStyle(.red)
            } else {
                Text("Qurilmalar qaysi filialdan qaysi filialga ketadi.")
            }
        }
    }

    private var inputSection: some View {
        Section("Qurilma qo'shish") {
            HStack {
                TextField("IMEI / Shtrix-kod", text: $manualInput)
                    .autocorrectionDisabled()
                    .textInputAutocapitalization(.characters)
                    .submitLabel(.done)
                    .onSubmit(addManual)
                Button("Qo'shish", action: addManual)
                    .buttonStyle(.bordered)
                    .disabled(manualInput.trimmingCharacters(in: .whitespaces).isEmpty)
            }
            Button { isShowingScanner = true } label: {
                Label("Kamera bilan skanerlash", systemImage: "camera.viewfinder")
            }
            if let feedback {
                InlineMessage(text: "\(feedback.code): \(feedback.message)", isError: feedback.isError)
            }
        }
    }

    private var scannedDevicesSection: some View {
        Section("Ko'chirilayotgan qurilmalar (\(viewModel.scannedItems.count))") {
            if viewModel.scannedItems.isEmpty {
                Text("Hali hech qanday qurilma skanerlanmadi").foregroundStyle(.secondary)
            } else {
                ForEach(viewModel.scannedItems) { item in
                    ScannedItemRow(item: item) { viewModel.removeItem(id: item.id) }
                }
            }
        }
    }

    private var noteSection: some View {
        Section("Izoh (ixtiyoriy)") {
            TextField("Masalan: Haydovchi orqali yuborildi", text: $viewModel.note, axis: .vertical)
        }
    }

    private var submitSection: some View {
        Section {
            if let err = viewModel.errorMessage {
                InlineMessage(text: err)
            } else if let succ = viewModel.successMessage {
                InlineMessage(text: succ, isError: false)
            }
            PrimaryButton(
                title: "Ko'chirishni tasdiqlash (\(viewModel.scannedItems.count))",
                isBusy: viewModel.isSubmitting,
                action: submitTransfer
            )
            .disabled(viewModel.isSubmitting || viewModel.scannedItems.isEmpty || isSameRoute)
        }
    }

    private func addManual() {
        let code = manualInput
        manualInput = ""
        scan(code)
    }

    /// Validates one code through the view model and records the result for the scanner panel.
    private func scan(_ code: String) {
        let clean = code.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !clean.isEmpty else { return }
        viewModel.successMessage = nil
        Task {
            if await viewModel.scanDevice(code: clean) {
                let name = viewModel.scannedItems.last?.productModel.name ?? "Qo'shildi"
                feedback = ScanFeedback(code: clean, message: name, isError: false)
            } else {
                feedback = ScanFeedback(code: clean, message: viewModel.errorMessage ?? "Xatolik", isError: true)
                // Shown once in the scan row; keep it out of the submit section.
                viewModel.errorMessage = nil
            }
        }
    }

    private func submitTransfer() {
        Task {
            if await viewModel.submitTransfer() {
                feedback = nil
                await viewModel.fetchRecentTransfers()
            }
        }
    }
}

/// Pending device in the transfer list with a visible remove button.
private struct ScannedItemRow: View {
    let item: Item
    let onRemove: () -> Void

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text(item.productModel.name).font(.body.weight(.medium))
                Text(item.primaryIdentifier).font(.caption.monospaced()).foregroundStyle(.secondary)
            }
            Spacer()
            Button(role: .destructive, action: onRemove) {
                Image(systemName: "trash").frame(minWidth: 44, minHeight: 44)
            }
            .buttonStyle(.borderless)
            .accessibilityLabel("O'chirish")
        }
    }
}

/// History of the latest transfers: route, date and note.
private struct RecentTransfersSection: View {
    let transfers: [StockTransferRecord]

    var body: some View {
        Section("So'nggi transferlar") {
            ForEach(transfers) { t in
                VStack(alignment: .leading, spacing: 4) {
                    HStack {
                        Text("\(t.fromLocation.name) → \(t.toLocation.name)").font(.subheadline.weight(.medium))
                        Spacer()
                        Text(t.date.prefix(10)).font(.caption).foregroundStyle(.secondary).monospacedDigit()
                    }
                    if let note = t.note, !note.isEmpty {
                        Text(note).font(.caption).foregroundStyle(.secondary)
                    }
                }
                .accessibilityElement(children: .combine)
            }
        }
    }
}
