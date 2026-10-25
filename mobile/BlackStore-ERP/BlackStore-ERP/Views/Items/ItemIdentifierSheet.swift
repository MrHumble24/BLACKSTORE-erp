import SwiftUI

/// "Identifikator qo'shish": IMEI or serial number, typed or scanned, checked like the server (FR-2).
struct ItemIdentifierSheet: View {
    @ObservedObject var viewModel: ItemDetailViewModel
    /// Types still under their per-item cap (two IMEI, one serial).
    let types: [String]
    @State private var type: String
    @State private var value = ""
    @State private var isScanning = false

    init(viewModel: ItemDetailViewModel, types: [String]) {
        self.viewModel = viewModel
        self.types = types
        _type = State(initialValue: types.first ?? "IMEI")
    }

    private var error: String? { IdentifierRules.error(type: type, value: value) }

    var body: some View {
        Group {
            if types.count > 1 {
                Section("Turi") {
                    Picker("Turi", selection: $type) {
                        ForEach(types, id: \.self) { Text(ItemText.identifierType($0)).tag($0) }
                    }
                    .pickerStyle(.segmented)
                }
            }
            Section {
                valueRow
                if !value.isEmpty, let error { InlineMessage(text: error, font: .caption) }
            } header: {
                Text(ItemText.identifierType(type))
            } footer: {
                Text("Qo'shilgan identifikatorni keyin o'chirib bo'lmaydi.")
            }
        }
        .formSheet(title: "Identifikator qo'shish", canSave: error == nil, isSaving: viewModel.isSaving, save: save)
        .sheet(isPresented: $isScanning) {
            ScannerSheet(title: "Kamerada skanerlash", onClose: { isScanning = false }) { code in
                value = code
                isScanning = false
                HapticManager.scanSuccess()
            }
        }
    }

    private var valueRow: some View {
        HStack {
            TextField(type == "IMEI" ? "15 ta raqam" : "Masalan: F2LZ...", text: $value)
                .font(.body.monospaced())
                .keyboardType(type == "IMEI" ? .numberPad : .asciiCapable)
                .textInputAutocapitalization(.characters)
                .autocorrectionDisabled()
            Button { isScanning = true } label: {
                Image(systemName: "barcode.viewfinder").font(.title3)
            }
            .buttonStyle(.borderless)
            .frame(minWidth: 44, minHeight: 44)
            .accessibilityLabel("Kamera bilan skanerlash")
        }
    }

    private func save() async throws {
        let clean = value.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
        try await viewModel.addIdentifier(AddIdentifierPayload(type: type, value: clean))
    }
}
