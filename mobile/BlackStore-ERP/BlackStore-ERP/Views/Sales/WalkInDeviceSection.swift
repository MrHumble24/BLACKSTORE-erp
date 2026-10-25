import SwiftUI

/// Device part of the walk-in form: model, branch, identifier (with scan), condition and price paid.
struct WalkInDeviceSection: View {
    @ObservedObject var viewModel: WalkInPurchaseViewModel
    let onScan: () -> Void

    var body: some View {
        Section("Model va Filial") {
            if viewModel.isLoading {
                LabeledContent("Model") { ProgressView() }
            } else {
                Picker("Model", selection: $viewModel.selectedModel) {
                    ForEach(viewModel.productModels) { model in
                        Text(model.name).tag(Optional(model))
                    }
                }
                Picker("Qabul qiluvchi filial", selection: $viewModel.selectedLocation) {
                    ForEach(viewModel.locations) { loc in
                        Text(loc.name).tag(Optional(loc))
                    }
                }
            }
        }
        identifierSection
        Section("Holati va narx") {
            Picker("Holati", selection: $viewModel.condition) {
                ForEach(viewModel.conditions, id: \.key) { cond in
                    Text(cond.title).tag(cond.key)
                }
            }
            LabeledContent("To'langan summa (\(APIConfig.currency))") {
                TextField("0.00", text: $viewModel.pricePaid)
                    .keyboardType(.decimalPad)
                    .multilineTextAlignment(.trailing)
                    .monospacedDigit()
                    .decimalCommaFix($viewModel.pricePaid)
            }
        }
    }

    private var identifierSection: some View {
        Section("Identifikator") {
            Picker("Turi", selection: $viewModel.identifierType) {
                Text("IMEI").tag("IMEI")
                Text("Seriya raqami").tag("SERIAL")
            }
            .pickerStyle(.segmented)
            HStack {
                TextField("Kod / IMEI qiymati", text: $viewModel.identifierValue)
                    .autocorrectionDisabled()
                    .textInputAutocapitalization(.characters)
                Button(action: onScan) {
                    Image(systemName: "barcode.viewfinder")
                        .font(.title3)
                        .frame(width: 44, height: 44)
                }
                .buttonStyle(.borderless)
                .accessibilityLabel("Kamera bilan skanerlash")
            }
        }
    }
}
