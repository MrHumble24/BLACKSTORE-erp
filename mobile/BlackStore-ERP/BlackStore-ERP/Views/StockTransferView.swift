import SwiftUI

/// Stock transfer view for moving devices between branches using camera scanner (PRD FR-5, W6).
public struct StockTransferView: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var viewModel = StockTransferViewModel()
    @State private var isShowingScanner: Bool = false
    @State private var manualInput: String = ""

    public init() {}

    public var body: some View {
        NavigationStack {
            Form {
                locationSection
                inputSection
                scannedDevicesSection
                noteSection

                if let err = viewModel.errorMessage {
                    Section {
                        Text(err).font(.caption).foregroundStyle(.red)
                    }
                }

                if let succ = viewModel.successMessage {
                    Section {
                        Text(succ).font(.caption).foregroundStyle(.green)
                    }
                }

                Section {
                    Button(action: submitTransfer) {
                        if viewModel.isSubmitting {
                            ProgressView().frame(maxWidth: .infinity)
                        } else {
                            Text("Ko'chirishni tasdiqlash (\(viewModel.scannedItems.count))")
                                .font(.headline)
                                .frame(maxWidth: .infinity)
                        }
                    }
                    .buttonStyle(.borderedProminent)
                    .controlSize(.large)
                    .disabled(viewModel.isSubmitting || viewModel.scannedItems.isEmpty)
                }

                if !viewModel.recentTransfers.isEmpty {
                    recentTransfersSection
                }
            }
            .navigationTitle("Filiallararo ko'chirish")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Yopish") { dismiss() }
                }
                ToolbarItem(placement: .primaryAction) {
                    Button {
                        isShowingScanner = true
                    } label: {
                        Image(systemName: "camera.viewfinder")
                    }
                }
            }
            .sheet(isPresented: $isShowingScanner) {
                NavigationStack {
                    VisionScannerView { code in
                        Task {
                            let _ = await viewModel.scanDevice(code: code)
                        }
                    }
                    .navigationTitle("Skanerlash")
                    .navigationBarTitleDisplayMode(.inline)
                    .toolbar {
                        ToolbarItem(placement: .cancellationAction) {
                            Button("Yopish") { isShowingScanner = false }
                        }
                    }
                }
            }
            .task {
                await viewModel.loadLocations()
                await viewModel.fetchRecentTransfers()
            }
        }
    }

    private var locationSection: some View {
        Section("Yo'nalish") {
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
        }
    }

    private var inputSection: some View {
        Section("Qurilma qo'shish") {
            HStack {
                TextField("IMEI / Shtrix-kod", text: $manualInput)
                    .autocorrectionDisabled()
                    .textInputAutocapitalization(.characters)
                    .onSubmit { addManual() }

                Button("Qo'shish") { addManual() }
                    .buttonStyle(.bordered)
                    .disabled(manualInput.trimmingCharacters(in: .whitespaces).isEmpty)
            }
        }
    }

    private var scannedDevicesSection: some View {
        Section("Ko'chirilayotgan qurilmalar (\(viewModel.scannedItems.count))") {
            if viewModel.scannedItems.isEmpty {
                Text("Hali hech qanday qurilma skanerlanmadi")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            } else {
                ForEach(viewModel.scannedItems) { item in
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(item.productModel.name)
                                .font(.subheadline)
                                .fontWeight(.medium)
                            Text(item.primaryIdentifier)
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                        }
                        Spacer()
                        Button(role: .destructive) {
                            viewModel.removeItem(id: item.id)
                        } label: {
                            Image(systemName: "trash")
                                .font(.caption)
                        }
                        .buttonStyle(.borderless)
                    }
                }
            }
        }
    }

    private var noteSection: some View {
        Section("Izoh (Ixtiyoriy)") {
            TextField("Masalan: Haydovchi orqali yuborildi", text: $viewModel.note)
        }
    }

    private var recentTransfersSection: some View {
        Section("So'nggi transferlar tarixi") {
            ForEach(viewModel.recentTransfers) { t in
                VStack(alignment: .leading, spacing: 4) {
                    HStack {
                        Text("\(t.fromLocation.name) → \(t.toLocation.name)")
                            .font(.subheadline)
                            .fontWeight(.medium)
                        Spacer()
                        Text(t.date.prefix(10))
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }
                    if let note = t.note, !note.isEmpty {
                        Text(note)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
                .padding(.vertical, 2)
            }
        }
    }

    private func addManual() {
        let code = manualInput
        manualInput = ""
        Task { _ = await viewModel.scanDevice(code: code) }
    }

    private func submitTransfer() {
        Task {
            let ok = await viewModel.submitTransfer()
            if ok {
                await viewModel.fetchRecentTransfers()
            }
        }
    }
}
