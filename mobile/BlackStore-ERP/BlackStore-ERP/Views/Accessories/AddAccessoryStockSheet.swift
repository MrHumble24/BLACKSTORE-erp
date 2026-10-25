import SwiftUI

/// "Kirim qilish" sheet: pick category, model and location, enter quantity and (with cost rights)
/// unit cost, then POST /accessory-stock. Needs receive_batch; the caller hides it otherwise.
struct AddAccessoryStockSheet: View {
    @ObservedObject var viewModel: AccessoryStockAdminViewModel
    /// view_cost + manage_prices: show and send the unit cost.
    let canSetCost: Bool
    @State private var categoryId: Int?
    @State private var modelId: Int?
    @State private var locationId: Int?
    @State private var quantityText = "1"
    @State private var costText = ""
    @State private var models: [ProductModel] = []
    @State private var modelsState = ModelsState.idle
    /// The preset model stays pickable even if it was made inactive.
    private let presetModelId: Int?

    /// Loading state of the model picker for the chosen category.
    private enum ModelsState: Equatable { case idle, loading, loaded, failed(String) }

    init(viewModel: AccessoryStockAdminViewModel, preset: AccessoryStockPreset, canSetCost: Bool) {
        self.viewModel = viewModel
        self.canSetCost = canSetCost
        _categoryId = State(initialValue: preset.categoryId)
        _modelId = State(initialValue: preset.modelId)
        presetModelId = preset.modelId
        _locationId = State(initialValue: preset.locationId)
    }

    private var quantity: Int? { AccessoryStockRules.quantity(quantityText) }
    private var unitCost: String?? { canSetCost ? AccessoryStockRules.unitCost(costText) : .some(nil) }
    private var canSave: Bool { modelId != nil && locationId != nil && quantity != nil && unitCost != nil }

    var body: some View {
        Group {
            productSection
            Section("Filial / ombor") {
                Picker("Filial / ombor", selection: $locationId) {
                    Text("Tanlang").tag(Int?.none)
                    ForEach(viewModel.locations) { Text($0.name).tag(Optional($0.id)) }
                }
            }
            quantitySection
            if canSetCost { costSection }
        }
        .task(id: categoryId) { await loadModels() }
        .formSheet(title: "Kirim qilish", canSave: canSave, isSaving: viewModel.isSaving, save: save)
    }

    private var productSection: some View {
        Section("Aksessuar") {
            Picker("Kategoriya", selection: $categoryId) {
                Text("Tanlang").tag(Int?.none)
                ForEach(viewModel.categories) { Text($0.name).tag(Optional($0.id)) }
            }
            if modelsState == .loading {
                LabeledContent("Model") { ProgressView() }
            } else {
                Picker("Model", selection: $modelId) {
                    Text("Tanlang").tag(Int?.none)
                    ForEach(models) { Text($0.name).tag(Optional($0.id)) }
                }
                .disabled(modelsState != .loaded)
            }
            modelsStatus
        }
    }

    @ViewBuilder
    private var modelsStatus: some View {
        switch modelsState {
        case .failed(let message):
            InlineMessage(text: message, font: .caption)
        case .loaded where models.isEmpty:
            Text("Bu kategoriyada faol model yo'q").font(.caption).foregroundStyle(.secondary)
        default:
            EmptyView()
        }
    }

    private var quantitySection: some View {
        Section {
            TextField("Miqdor", text: $quantityText)
                .keyboardType(.numberPad)
                .monospacedDigit()
            if !quantityText.isEmpty, quantity == nil {
                InlineMessage(text: "Miqdor musbat butun son bo'lishi kerak", font: .caption)
            }
        } header: {
            Text("Miqdor (soni)")
        }
    }

    private var costSection: some View {
        Section {
            TextField("0.00", text: $costText)
                .keyboardType(.decimalPad)
                .monospacedDigit()
                .decimalCommaFix($costText)
            if unitCost == nil {
                InlineMessage(text: "Summani to'g'ri kiriting (masalan, 12.50)", font: .caption)
            }
        } header: {
            Text("Dona tannarxi")
        } footer: {
            Text("Bo'sh qoldirilsa, o'rtacha tannarx o'zgarmaydi.")
        }
    }

    /// Loads the chosen category's models; keeps the picked model only if it belongs to it.
    private func loadModels() async {
        guard let categoryId else {
            models = []
            modelId = nil
            modelsState = .idle
            return
        }
        modelsState = .loading
        do {
            models = try await viewModel.models(categoryId: categoryId)
                .filter { ($0.isActive ?? true) || $0.id == presetModelId }
            if let modelId, !models.contains(where: { $0.id == modelId }) { self.modelId = nil }
            modelsState = .loaded
        } catch is CancellationError {
            return
        } catch {
            modelsState = .failed(error.localizedDescription)
        }
    }

    private func save() async throws {
        guard let modelId, let locationId, let quantity, let unitCost else { return }
        try await viewModel.addStock(
            AddAccessoryStockBody(productModelId: modelId, locationId: locationId, quantity: quantity, unitCost: unitCost)
        )
    }
}
