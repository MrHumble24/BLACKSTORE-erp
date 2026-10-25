import SwiftUI

/// Modal sheet for purchasing a device from a walk-in seller or customer trade-in (PRD FR-25).
public struct WalkInPurchaseSheet: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var viewModel = WalkInPurchaseViewModel()
    @State private var isShowingScanner: Bool = false
    public let onPurchaseCompleted: (Item) -> Void

    public init(onPurchaseCompleted: @escaping (Item) -> Void) {
        self.onPurchaseCompleted = onPurchaseCompleted
    }

    public var body: some View {
        NavigationStack {
            Form {
                sellerSection
                deviceSection
                identifierSection
                conditionSection
                pricingSection

                if let err = viewModel.errorMessage {
                    Section {
                        Text(err)
                            .font(.caption)
                            .foregroundStyle(.red)
                    }
                }

                Section {
                    Button(action: submitPurchase) {
                        if viewModel.isSubmitting {
                            ProgressView()
                                .frame(maxWidth: .infinity)
                        } else {
                            Text("Qabul qilish va kirim qilish")
                                .font(.headline)
                                .frame(maxWidth: .infinity)
                        }
                    }
                    .buttonStyle(.borderedProminent)
                    .controlSize(.large)
                    .disabled(viewModel.isSubmitting)
                }
            }
            .navigationTitle("Mijozdan sotib olish")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Bekor qilish") { dismiss() }
                }
            }
            .sheet(isPresented: $isShowingScanner) {
                NavigationStack {
                    VisionScannerView { code in
                        viewModel.identifierValue = code
                        isShowingScanner = false
                    }
                    .navigationTitle("Shtrix-kod / IMEI skaneri")
                    .navigationBarTitleDisplayMode(.inline)
                    .toolbar {
                        ToolbarItem(placement: .cancellationAction) {
                            Button("Yopish") { isShowingScanner = false }
                        }
                    }
                }
            }
            .task {
                await viewModel.loadInitialData()
            }
        }
    }

    private var sellerSection: some View {
        Section("Mijoz (Sotuvchi)") {
            TextField("Ism familiyasi", text: $viewModel.sellerName)
            TextField("Telefon raqami", text: $viewModel.sellerPhone)
                .keyboardType(.phonePad)
        }
    }

    private var deviceSection: some View {
        Section("Model va Filial") {
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

                Button {
                    isShowingScanner = true
                } label: {
                    Image(systemName: "camera.viewfinder")
                        .font(.title3)
                }
                .buttonStyle(.borderless)
            }
        }
    }

    private var conditionSection: some View {
        Section("Holati") {
            Picker("Holati", selection: $viewModel.condition) {
                ForEach(viewModel.conditions, id: \.key) { cond in
                    Text(cond.title).tag(cond.key)
                }
            }
            .pickerStyle(.segmented)
        }
    }

    private var pricingSection: some View {
        Section("To'langan summa") {
            HStack {
                Text("Summa ($):")
                Spacer()
                TextField("0.00", text: $viewModel.pricePaid)
                    .keyboardType(.decimalPad)
                    .multilineTextAlignment(.trailing)
                    .frame(width: 120)
            }
        }
    }

    private func submitPurchase() {
        Task {
            let success = await viewModel.submitPurchase()
            if success, let item = viewModel.successItem {
                onPurchaseCompleted(item)
                dismiss()
            }
        }
    }
}
