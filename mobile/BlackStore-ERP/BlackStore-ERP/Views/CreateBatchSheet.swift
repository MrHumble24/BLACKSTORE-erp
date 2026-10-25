import SwiftUI

/// Modal sheet for creating a new supplier batch shipment (FR-16).
public struct CreateBatchSheet: View {
    @Environment(\.dismiss) private var dismiss
    @ObservedObject public var viewModel: BatchesViewModel

    @State private var selectedSupplier: Supplier? = nil
    @State private var selectedLocation: StoreLocation? = nil
    @State private var arrivalDate: Date = Date()
    @State private var trackingNumber: String = ""
    @State private var note: String = ""
    @State private var errorMessage: String? = nil

    public init(viewModel: BatchesViewModel) {
        self.viewModel = viewModel
    }

    public var body: some View {
        NavigationStack {
            Form {
                supplierSection
                locationSection
                shipmentSection
            }
            .navigationTitle("Yangi partiya ochish")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Bekor qilish") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Ochish") { submitBatch() }
                        .disabled(selectedSupplier == nil || selectedLocation == nil || viewModel.isLoading)
                }
            }
            .onAppear {
                if selectedLocation == nil, let first = viewModel.locations.first {
                    selectedLocation = first
                }
                if selectedSupplier == nil, let first = viewModel.suppliers.first {
                    selectedSupplier = first
                }
            }
        }
    }

    private var supplierSection: some View {
        Section("Yetkazib beruvchi") {
            Picker("Yetkazib beruvchini tanlang", selection: $selectedSupplier) {
                Text("Tanlanmagan").tag(nil as Supplier?)
                ForEach(viewModel.suppliers) { sup in
                    Text(sup.name).tag(sup as Supplier?)
                }
            }
        }
    }

    private var locationSection: some View {
        Section("Qabul qiluvchi ombor/do'kon") {
            Picker("Omborni tanlang", selection: $selectedLocation) {
                Text("Tanlanmagan").tag(nil as StoreLocation?)
                ForEach(viewModel.locations) { loc in
                    Text(loc.name).tag(loc as StoreLocation?)
                }
            }
        }
    }

    private var shipmentSection: some View {
        Section("Yetkazib berish ma'lumotlari") {
            DatePicker("Yetib kelgan sana", selection: $arrivalDate, displayedComponents: .date)
            TextField("Trek raqami (ixtiyoriy)", text: $trackingNumber)
            TextField("Izoh (ixtiyoriy)", text: $note)

            if let err = errorMessage {
                Text(err)
                    .font(.caption2)
                    .foregroundStyle(.red)
            }
        }
    }

    private func submitBatch() {
        guard let sup = selectedSupplier, let loc = selectedLocation else {
            errorMessage = "Yetkazib beruvchi va ombor tanlanishi shart"
            return
        }

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
            }
        }
    }
}
