import SwiftUI

/// Sheet for opening a new supplier batch shipment (FR-16).
public struct CreateBatchSheet: View {
    @Environment(\.dismiss) private var dismiss
    @ObservedObject public var viewModel: BatchesViewModel

    @State private var selectedSupplier: Supplier? = nil
    @State private var selectedLocation: StoreLocation? = nil
    @State private var arrivalDate: Date = Date()
    @State private var trackingNumber: String = ""
    @State private var note: String = ""

    public init(viewModel: BatchesViewModel) {
        self.viewModel = viewModel
    }

    private var isValid: Bool {
        selectedSupplier != nil && selectedLocation != nil && !viewModel.isLoading
    }

    public var body: some View {
        NavigationStack {
            Form {
                sourceSection
                shipmentSection
                if let err = viewModel.errorMessage {
                    Section { InlineMessage(text: err) }
                }
                Section {
                    PrimaryButton(title: "Partiyani ochish", isBusy: viewModel.isLoading, action: submitBatch)
                        .disabled(!isValid)
                }
                .listRowInsets(EdgeInsets())
                .listRowBackground(Color.clear)
            }
            .navigationTitle("Yangi partiya")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Bekor qilish") { dismiss() }
                }
            }
            .onAppear(perform: preselectDefaults)
        }
        .presentationDetents([.large])
        .presentationDragIndicator(.visible)
    }

    private var sourceSection: some View {
        Section {
            Picker("Yetkazib beruvchi", selection: $selectedSupplier) {
                Text("Tanlanmagan").tag(nil as Supplier?)
                ForEach(viewModel.suppliers) { sup in
                    Text(sup.name).tag(sup as Supplier?)
                }
            }
            Picker("Qabul ombori", selection: $selectedLocation) {
                Text("Tanlanmagan").tag(nil as StoreLocation?)
                ForEach(viewModel.locations) { loc in
                    Text(loc.name).tag(loc as StoreLocation?)
                }
            }
        } header: {
            Text("Qayerdan va qayerga")
        } footer: {
            Text("Mahsulot kimdan kelgani va qaysi omborga qabul qilinishi.")
        }
    }

    private var shipmentSection: some View {
        Section("Yetkazib berish ma'lumotlari") {
            DatePicker("Yetib kelgan sana", selection: $arrivalDate, displayedComponents: .date)
            TextField("Trek raqami (ixtiyoriy)", text: $trackingNumber)
                .textInputAutocapitalization(.characters)
                .autocorrectionDisabled()
            TextField("Izoh (ixtiyoriy)", text: $note, axis: .vertical)
        }
    }

    /// Picks the first supplier and location so the common case needs no taps; clears stale errors.
    private func preselectDefaults() {
        viewModel.errorMessage = nil
        if selectedLocation == nil { selectedLocation = viewModel.locations.first }
        if selectedSupplier == nil { selectedSupplier = viewModel.suppliers.first }
    }

    private func submitBatch() {
        guard let sup = selectedSupplier, let loc = selectedLocation else { return }
        Task {
            let res = await viewModel.createBatch(
                supplierId: sup.id,
                locationId: loc.id,
                arrivalDate: arrivalDate,
                trackingNumber: trackingNumber,
                note: note
            )
            if res != nil {
                HapticManager.success()
                dismiss()
            } else {
                HapticManager.error()
            }
        }
    }
}
