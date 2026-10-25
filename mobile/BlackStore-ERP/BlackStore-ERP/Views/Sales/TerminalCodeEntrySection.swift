import SwiftUI

/// Top section of the POS: code field, scan feedback and the quick-action buttons.
struct TerminalCodeEntrySection: View {
    @ObservedObject var cartViewModel: CartViewModel
    let open: (SalesTerminalView.TerminalSheet) -> Void
    @State private var code = ""

    private var canSubmit: Bool {
        !code.trimmingCharacters(in: .whitespaces).isEmpty && !cartViewModel.isScanning
    }

    var body: some View {
        Section {
            HStack(spacing: 8) {
                TextField("IMEI / Shtrix-kod / S/N", text: $code)
                    .textInputAutocapitalization(.characters)
                    .autocorrectionDisabled()
                    .submitLabel(.done)
                    .onSubmit(submit)
                Button(action: submit) {
                    if cartViewModel.isScanning {
                        ProgressView()
                    } else {
                        Text("Qo'shish")
                    }
                }
                .buttonStyle(.borderedProminent)
                .disabled(!canSubmit)
            }
            .frame(minHeight: 44)
            feedback
            quickActions
        } header: {
            header
        } footer: {
            Text("Kodni kiriting yoki kamera bilan skanerlang.")
        }
    }

    @ViewBuilder
    private var feedback: some View {
        if let err = cartViewModel.errorMessage {
            Label(err, systemImage: "exclamationmark.triangle.fill")
                .font(.subheadline)
                .foregroundStyle(.red)
        } else if let ok = cartViewModel.successMessage {
            Label(ok, systemImage: "checkmark.circle.fill")
                .font(.subheadline)
                .foregroundStyle(.green)
        }
    }

    private var quickActions: some View {
        HStack(spacing: 0) {
            quickAction("Ombor", icon: "shippingbox", sheet: .inventory)
            quickAction("Trade-in", icon: "arrow.triangle.2.circlepath", sheet: .walkIn)
            quickAction("Aksessuar", icon: "cable.connector", sheet: .accessory)
            quickAction("Tekshirish", icon: "info.circle", sheet: .inspector)
        }
    }

    /// Section header; in debug builds a triple tap on it opens the developer panel.
    private var header: some View {
        let text = Text("Mahsulot qo'shish")
        #if DEBUG
        return text.onTapGesture(count: 3) {
            open(.devPanel)
            HapticManager.success()
        }
        #else
        return text
        #endif
    }

    private func quickAction(_ title: String, icon: String, sheet: SalesTerminalView.TerminalSheet) -> some View {
        Button { open(sheet) } label: {
            VStack(spacing: 4) {
                Image(systemName: icon).font(.title3)
                Text(title).font(.caption).lineLimit(1).minimumScaleFactor(0.8)
            }
            .frame(maxWidth: .infinity, minHeight: 52)
            .contentShape(Rectangle())
        }
        .buttonStyle(.borderless)
    }

    private func submit() {
        guard canSubmit else { return }
        let value = code
        code = ""
        Task { _ = await cartViewModel.scanCode(value) }
    }
}
