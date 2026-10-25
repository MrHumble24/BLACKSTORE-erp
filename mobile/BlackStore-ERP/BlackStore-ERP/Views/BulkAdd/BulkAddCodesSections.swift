import SwiftUI

/// Codes-per-device choice, the codes box (paste or type, camera appends) and the live check:
/// how many devices will be added, repeats dropped, and each wrong line with its reason.
struct BulkAddCodesSections: View {
    @ObservedObject var vm: BulkAddViewModel
    let onScan: () -> Void

    var body: some View {
        Section {
            Picker("Har bir qurilma uchun", selection: $vm.layout) {
                ForEach(BulkCodeLayout.allCases) { Text($0.rawValue).tag($0) }
            }
            .pickerStyle(.segmented)
            .listRowBackground(Color.clear)
            .listRowInsets(EdgeInsets())
        } header: {
            Text("Har bir qurilma uchun")
        }
        Section {
            editor
            Button(action: onScan) {
                HStack(spacing: 8) {
                    Image(systemName: "barcode.viewfinder")
                    Text("Kamera bilan skanerlash")
                }
            }
        } header: {
            Text("Kodlar")
        } footer: {
            Text(vm.layout.hint)
        }
        if vm.codes != BulkCodeList() { checkSection }
    }

    private var editor: some View {
        TextEditor(text: $vm.codesText)
            .font(.body.monospaced())
            .autocorrectionDisabled()
            .textInputAutocapitalization(.characters)
            .frame(minHeight: 160)
            .overlay(alignment: .topLeading) {
                if vm.codesText.isEmpty {
                    Text(placeholder)
                        .font(.body.monospaced())
                        .foregroundStyle(.tertiary)
                        .padding(.top, 8)
                        .padding(.leading, 5)
                        .allowsHitTesting(false)
                        .accessibilityHidden(true)
                }
            }
            .accessibilityLabel("Kodlar ro'yxati")
            .accessibilityHint(vm.layout.hint)
    }

    /// Example lines in the shape the chosen layout expects.
    private var placeholder: String {
        switch vm.layout {
        case .imei: "356789012345678\n356789012345679"
        case .twoImei: "356789012345678 356789012345686"
        case .imeiSerial: "356789012345678 F2LZX1ABQ1"
        }
    }

    private var checkSection: some View {
        Section("Tekshiruv") {
            LabeledContent("Qo'shiladi", value: summary)
                .monospacedDigit()
            if vm.codes.duplicateCount > 0 {
                LabeledContent("Takroriy, olib tashlandi", value: "\(vm.codes.duplicateCount) ta")
                    .monospacedDigit()
            }
            ForEach(vm.codes.rejected) { BulkCodeResultRow(code: $0.value, message: $0.reason, isError: true) }
            if !vm.codes.rejected.isEmpty {
                Button("Noto'g'ri qatorlarni olib tashlash (\(vm.codes.rejected.count))", role: .destructive) {
                    vm.removeRejected()
                }
            }
        }
    }

    /// "3 ta qurilma (6 ta kod)"; with one code per device just "3 ta qurilma".
    private var summary: String {
        let devices = "\(vm.codes.valid.count) ta qurilma"
        return vm.layout.kinds.count == 1 ? devices : "\(devices) (\(vm.codes.codeCount) ta kod)"
    }
}

/// One code with a green tick or red cross and a short message under it.
struct BulkCodeResultRow: View {
    let code: String
    let message: String
    let isError: Bool

    var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: 10) {
            Image(systemName: isError ? "xmark.octagon.fill" : "checkmark.circle.fill")
                .foregroundStyle(isError ? Color.red : Color.green)
                .accessibilityHidden(true)
            VStack(alignment: .leading, spacing: 2) {
                Text(code).font(.body.monospaced()).textSelection(.enabled)
                Text(message).font(.footnote).foregroundStyle(isError ? Color.red : Color.secondary)
            }
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(code), \(isError ? "xato" : "qo'shildi"): \(message)")
    }
}
