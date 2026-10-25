import SwiftUI

/// Physical stock count view for shelf auditing via camera barcode scanning (PRD FR-6, W7).
public struct StockCountView: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var viewModel = StockCountViewModel()
    @State private var isShowingScanner: Bool = false
    @State private var manualInput: String = ""

    public init() {}

    public var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                if let count = viewModel.activeCount {
                    if count.isFinished {
                        finishedAuditView(count: count)
                    } else {
                        activeAuditView(count: count)
                    }
                } else {
                    setupView
                }
            }
            .navigationTitle("Inventarizatsiya")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Yopish") { dismiss() }
                }
            }
            .sheet(isPresented: $isShowingScanner) {
                NavigationStack {
                    VisionScannerView { code in
                        Task { _ = await viewModel.recordScan(code: code) }
                    }
                    .navigationTitle("Skanerlash")
                    .navigationBarTitleDisplayMode(.inline)
                    .toolbar {
                        ToolbarItem(placement: .cancellationAction) {
                            Button("Tugatish") { isShowingScanner = false }
                        }
                    }
                }
            }
            .task {
                await viewModel.loadLocations()
            }
        }
    }

    private var setupView: some View {
        Form {
            Section("Filial tanlash") {
                Picker("Filial", selection: $viewModel.selectedLocation) {
                    ForEach(viewModel.locations) { loc in
                        Text(loc.name).tag(Optional(loc))
                    }
                }
            }

            if let err = viewModel.errorMessage {
                Section {
                    Text(err).font(.caption).foregroundStyle(.red)
                }
            }

            Section {
                Button(action: startAudit) {
                    if viewModel.isLoading {
                        ProgressView().frame(maxWidth: .infinity)
                    } else {
                        Text("Auditni boshlash")
                            .font(.headline)
                            .frame(maxWidth: .infinity)
                    }
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.large)
            }
        }
    }

    private func activeAuditView(count: StockCount) -> some View {
        VStack(spacing: 0) {
            auditStatBar(count: count)

            HStack(spacing: 8) {
                TextField("Kod / IMEI", text: $manualInput)
                    .textFieldStyle(.roundedBorder)
                    .textInputAutocapitalization(.characters)
                    .onSubmit { submitManual() }

                Button("Qo'shish") { submitManual() }
                    .buttonStyle(.bordered)

                Button {
                    isShowingScanner = true
                } label: {
                    Image(systemName: "camera.viewfinder")
                        .font(.title3)
                }
                .buttonStyle(.borderedProminent)
            }
            .padding()
            .background(Color(.secondarySystemBackground))

            List {
                Section("Oxirgi skanerlanganlar") {
                    if viewModel.recentScans.isEmpty {
                        Text("Hali skanerlanmadi").font(.caption).foregroundStyle(.secondary)
                    } else {
                        ForEach(viewModel.recentScans, id: \.code) { scan in
                            scanRow(scan: scan)
                        }
                    }
                }
            }
            .listStyle(.plain)

            Button(action: finishAudit) {
                Text("Auditni yakunlash")
                    .font(.headline)
                    .frame(maxWidth: .infinity)
                    .padding()
            }
            .buttonStyle(.borderedProminent)
            .tint(.red)
            .padding()
        }
    }

    private func auditStatBar(count: StockCount) -> some View {
        let expected = count.result?.expectedCount ?? 0
        let found = count.result?.found ?? 0

        return HStack(spacing: 16) {
            statBlock(title: "Kutilgan", value: "\(expected)", color: .primary)
            statBlock(title: "Topildi", value: "\(found)", color: .green)
            statBlock(title: "Yetishmayotgan", value: "\(max(0, expected - found))", color: .red)
        }
        .padding()
        .background(Color(.systemBackground))
        .overlay(Divider(), alignment: .bottom)
    }

    private func statBlock(title: String, value: String, color: Color) -> some View {
        VStack(spacing: 2) {
            Text(value)
                .font(.title2)
                .fontWeight(.bold)
                .foregroundStyle(color)
            Text(title)
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
    }

    private func scanRow(scan: StockCountScanResponse) -> some View {
        HStack {
            Text(scan.code)
                .font(.subheadline)
                .fontWeight(.medium)
            Spacer()
            Text(scan.status.title)
                .font(.caption2)
                .padding(.horizontal, 8)
                .padding(.vertical, 2)
                .background(badgeColor(scan.status).opacity(0.15))
                .foregroundStyle(badgeColor(scan.status))
                .clipShape(Capsule())
        }
    }

    private func finishedAuditView(count: StockCount) -> some View {
        List {
            Section("Natija") {
                LabeledContent("Kutilgan", value: "\(count.result?.expectedCount ?? 0)")
                LabeledContent("Topildi", value: "\(count.result?.found ?? 0)")
                LabeledContent("Kamomad (Yetishmayotgan)", value: "\(count.result?.missing.count ?? 0)")
            }

            if let missing = count.result?.missing, !missing.isEmpty {
                Section("Topilmagan qurilmalar (\(missing.count))") {
                    ForEach(missing) { item in
                        VStack(alignment: .leading, spacing: 2) {
                            Text(item.productModel.name)
                                .font(.subheadline)
                            if let firstId = item.identifiers.first {
                                Text("\(firstId.type): \(firstId.value)")
                                    .font(.caption2)
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }
                }
            }

            Section {
                Button("Yangi audit boshlash") {
                    viewModel.activeCount = nil
                }
                .frame(maxWidth: .infinity)
            }
        }
    }

    private func badgeColor(_ status: StockScanStatus) -> Color {
        switch status {
        case .found: return .green
        case .duplicate: return .gray
        case .unknown, .wrongLocation: return .red
        }
    }

    private func submitManual() {
        let code = manualInput
        manualInput = ""
        Task { _ = await viewModel.recordScan(code: code) }
    }

    private func startAudit() {
        Task { _ = await viewModel.startCount() }
    }

    private func finishAudit() {
        Task { _ = await viewModel.finishCount() }
    }
}
