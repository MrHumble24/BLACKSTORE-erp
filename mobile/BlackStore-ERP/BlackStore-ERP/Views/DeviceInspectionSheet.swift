import SwiftUI

/// Device inspection modal allowing staff to scan and view full hardware specifications and stock status.
public struct DeviceInspectionSheet: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var viewModel = DeviceLookupViewModel()
    public let onAddToCart: ((Item) -> Void)?

    @State private var inputCode: String = ""
    @State private var isShowingCamera: Bool = false
    @State private var isShowingLabelPrint: Bool = false

    public init(onAddToCart: ((Item) -> Void)? = nil) {
        self.onAddToCart = onAddToCart
    }

    public var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                searchInputBar

                if viewModel.isLoading {
                    ProgressView("Qurilma qidirilmoqda...")
                        .frame(maxHeight: .infinity)
                } else if let item = viewModel.item {
                    itemDetailView(for: item)
                } else {
                    ContentUnavailableView(
                        "Qurilmani skanerlang",
                        systemImage: "magnifyingglass",
                        description: Text("IMEI yoki seriya raqamini skanerlab, uning to'liq xarakteristikasini ko'ring.")
                    )
                }
            }
            .navigationTitle("Qurilma ma'lumotlari")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Yopish") { dismiss() }
                }

                ToolbarItem(placement: .primaryAction) {
                    Button {
                        isShowingCamera = true
                    } label: {
                        Image(systemName: "camera.fill")
                    }
                }
            }
            .sheet(isPresented: $isShowingCamera) {
                NavigationStack {
                    VisionScannerView { code in
                        inputCode = code
                        isShowingCamera = false
                        Task { await viewModel.lookup(code: code) }
                    }
                    .navigationTitle("Kamerada skanerlash")
                    .navigationBarTitleDisplayMode(.inline)
                    .toolbar {
                        ToolbarItem(placement: .cancellationAction) {
                            Button("Yopish") { isShowingCamera = false }
                        }
                    }
                }
            }
            .sheet(isPresented: $isShowingLabelPrint) {
                if let item = viewModel.item {
                    BarcodePrintSheet(item: item)
                }
            }
        }
    }

    private var searchInputBar: some View {
        HStack {
            TextField("IMEI / Seriya raqami", text: $inputCode)
                .textFieldStyle(.roundedBorder)
                .textInputAutocapitalization(.characters)
                .autocorrectionDisabled()
                .onSubmit {
                    Task { await viewModel.lookup(code: inputCode) }
                }

            Button {
                Task { await viewModel.lookup(code: inputCode) }
            } label: {
                Text("Qidirish")
            }
            .buttonStyle(.borderedProminent)
            .disabled(inputCode.trimmingCharacters(in: .whitespaces).isEmpty)
        }
        .padding()
        .background(Color(.secondarySystemBackground))
    }

    private func itemDetailView(for item: Item) -> some View {
        List {
            Section("Asosiy ma'lumotlar") {
                LabeledContent("Model", value: item.productModel.name)
                if let cat = item.productModel.category {
                    LabeledContent("Kategoriya", value: cat.name)
                }
                LabeledContent("Holati", value: item.condition)
                LabeledContent("Status", value: item.status)
                if let loc = item.location {
                    LabeledContent("Joylashuv", value: loc.name)
                }
                LabeledContent("Narxi", value: APIConfig.formatMoney(item.salePrice))
            }

            Section("Identifikatorlar") {
                ForEach(item.identifiers) { id in
                    LabeledContent(id.type, value: id.value)
                }
            }

            if let attrs = item.attributes, !attrs.isEmpty {
                Section("Texnik parametrlar") {
                    ForEach(attrs.sorted(by: { $0.key < $1.key }), id: \.key) { key, val in
                        LabeledContent(key.capitalized, value: val)
                    }
                }
            }

            Section {
                Button {
                    isShowingLabelPrint = true
                } label: {
                    Label("Yorliq (Shtrix-kod) chop etish", systemImage: "printer")
                        .font(.headline)
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.bordered)
                .controlSize(.large)
            }

            if let onAddToCart = onAddToCart, item.status == "IN_STOCK" {
                Section {
                    Button {
                        onAddToCart(item)
                        dismiss()
                    } label: {
                        Label("Savatchaga qo'shish", systemImage: "cart.badge.plus")
                            .font(.headline)
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.borderedProminent)
                    .controlSize(.large)
                }
            }
        }
        .listStyle(.insetGrouped)
    }
}
