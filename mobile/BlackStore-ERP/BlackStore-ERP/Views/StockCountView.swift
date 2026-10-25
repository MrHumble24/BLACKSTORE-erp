import SwiftUI

/// Physical stock count: pick a branch, scan the shelf, finish to lock discrepancies (PRD FR-6, W7).
public struct StockCountView: View {
    @StateObject private var viewModel = StockCountViewModel()
    @State private var isShowingScanner: Bool = false
    @State private var isConfirmingFinish: Bool = false
    @State private var manualInput: String = ""
    @State private var feedback: ScanFeedback? = nil
    @State private var finishError: String? = nil

    public init() {}

    public var body: some View {
        Group {
            if let count = viewModel.activeCount {
                if count.isFinished {
                    StockCountResultView(count: count) {
                        feedback = nil
                        viewModel.activeCount = nil
                    }
                } else {
                    activeAuditView(count: count)
                }
            } else {
                setupView
            }
        }
        .navigationTitle("Inventarizatsiya")
        .navigationBarTitleDisplayMode(.inline)
        .sheet(isPresented: $isShowingScanner) {
            ScannerSheet(title: "Skanerlash", count: viewModel.recentScans.count, feedback: feedback) { code in
                scan(code)
            }
        }
        .confirmationDialog("Auditni yakunlaysizmi?", isPresented: $isConfirmingFinish, titleVisibility: .visible) {
            Button("Auditni yakunlash", role: .destructive) {
                Task {
                    if !(await viewModel.finishCount()) { finishError = viewModel.errorMessage ?? "Xatolik" }
                }
            }
            Button("Bekor qilish", role: .cancel) {}
        } message: {
            Text("Yakunlangandan so'ng skanerlab bo'lmaydi, kamomad qayd etiladi.")
        }
        .alert("Auditni yakunlab bo'lmadi", isPresented: Binding(isPresent: $finishError)) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(finishError ?? "")
        }
        .task { await viewModel.loadLocations() }
    }

    private var setupView: some View {
        Form {
            Section {
                Picker("Filial", selection: $viewModel.selectedLocation) {
                    ForEach(viewModel.locations) { loc in
                        Text(loc.name).tag(Optional(loc))
                    }
                }
            } header: {
                Text("Filial tanlash")
            } footer: {
                Text("Tanlangan filialdagi barcha qurilmalarni skanerlab sanaysiz.")
            }
            Section {
                if let err = viewModel.errorMessage {
                    InlineMessage(text: err)
                }
                PrimaryButton(title: "Auditni boshlash", systemImage: "play.fill", isBusy: viewModel.isLoading) {
                    Task { _ = await viewModel.startCount() }
                }
                .disabled(viewModel.selectedLocation == nil || viewModel.isLoading)
            }
        }
    }

    private func activeAuditView(count: StockCount) -> some View {
        List {
            Section { StockCountStatsRow(result: count.result) }
            Section("Kod kiritish") {
                manualEntryRow
                Button { isShowingScanner = true } label: {
                    Label("Kamera bilan skanerlash", systemImage: "camera.viewfinder")
                }
                if let feedback {
                    InlineMessage(text: "\(feedback.code): \(feedback.message)", isError: feedback.isError)
                }
            }
            Section("Oxirgi skanerlanganlar (\(viewModel.recentScans.count))") {
                if viewModel.recentScans.isEmpty {
                    Text("Hali skanerlanmadi").foregroundStyle(.secondary)
                } else {
                    ForEach(Array(viewModel.recentScans.enumerated()), id: \.offset) { _, scan in
                        StockScanRow(scan: scan)
                    }
                }
            }
        }
        .listStyle(.insetGrouped)
        .safeAreaInset(edge: .bottom) {
            BottomBar(title: "Auditni yakunlash", systemImage: "flag.checkered", isBusy: viewModel.isLoading, isDisabled: false) {
                isConfirmingFinish = true
            }
        }
    }

    private var manualEntryRow: some View {
        HStack {
            TextField("Kod / IMEI", text: $manualInput)
                .textInputAutocapitalization(.characters)
                .autocorrectionDisabled()
                .submitLabel(.done)
                .onSubmit(submitManual)
            Button("Qo'shish", action: submitManual)
                .buttonStyle(.bordered)
                .disabled(manualInput.trimmingCharacters(in: .whitespaces).isEmpty)
        }
    }

    private func submitManual() {
        let code = manualInput
        manualInput = ""
        scan(code)
    }

    /// Records one code and keeps its result for the scanner panel.
    private func scan(_ code: String) {
        let clean = code.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !clean.isEmpty else { return }
        Task {
            if await viewModel.recordScan(code: clean), let last = viewModel.recentScans.first(where: { $0.code == clean }) {
                feedback = ScanFeedback(code: last.code, message: last.status.title, isError: last.status != .found)
            } else {
                feedback = ScanFeedback(code: clean, message: viewModel.errorMessage ?? "Xatolik", isError: true)
            }
        }
    }
}
