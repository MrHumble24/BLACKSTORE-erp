import SwiftUI

/// Pick a code, preview the 50x30 mm sticker and print or share it (FR-15).
public struct BarcodePrintSheet: View {
    @Environment(\.dismiss) private var dismiss
    public let item: Item

    @State private var selectedIdentifier: String = ""
    @State private var copies: Int = 1
    @State private var labelImage: UIImage? = nil

    public init(item: Item) {
        self.item = item
    }

    public var body: some View {
        NavigationStack {
            Form {
                Section("Shtrix-kod kodi") {
                    Picker("Kod", selection: $selectedIdentifier) {
                        ForEach(item.identifiers) { idf in
                            Text("\(idf.type): \(idf.value)").tag(idf.value)
                        }
                    }
                }
                Section {
                    labelPreview
                } header: {
                    Text("Yorliq ko'rinishi (50x30 mm)")
                }
                Section {
                    Stepper("Nusxalar soni: \(copies)", value: $copies, in: 1...20)
                        .monospacedDigit()
                }
            }
            .safeAreaInset(edge: .bottom) { actionButtons }
            .navigationTitle("Yorliq chop etish")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Yopish") { dismiss() }
                }
            }
            .onAppear {
                initializeDefaultIdentifier()
                renderActiveLabel()
            }
            .onChange(of: selectedIdentifier) {
                renderActiveLabel()
            }
        }
        .presentationDetents([.large])
        .presentationDragIndicator(.visible)
    }

    @ViewBuilder
    private var labelPreview: some View {
        if let image = labelImage {
            Image(uiImage: image)
                .resizable()
                .scaledToFit()
                .frame(maxWidth: .infinity, maxHeight: 200)
                .padding(10)
                // The printed sticker is white paper, so the preview stays white in dark mode too.
                .background(Color.white, in: RoundedRectangle(cornerRadius: 12))
                .accessibilityLabel("Yorliq ko'rinishi: \(item.productModel.name)")
        } else {
            ProgressView().frame(maxWidth: .infinity, minHeight: 120)
        }
    }

    private var actionButtons: some View {
        SalesBottomBar(
            title: "AirPrint orqali chop etish",
            systemImage: "printer.fill",
            isDisabled: labelImage == nil,
            action: printLabel
        ) {
            if let img = labelImage {
                ShareLink(item: Image(uiImage: img), preview: SharePreview("Yorliq", image: Image(uiImage: img))) {
                    Label("Rasmni saqlash / Ulashish", systemImage: "square.and.arrow.up")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.bordered)
                .controlSize(.large)
            }
        }
    }

    private func printLabel() {
        guard let img = labelImage else { return }
        BarcodeLabelPrinter.shared.printLabel(image: img, jobName: "\(item.productModel.name) Label")
        HapticManager.selection()
    }

    private func initializeDefaultIdentifier() {
        if let sys = item.identifiers.first(where: { $0.type.uppercased().contains("SYSTEM") }) {
            selectedIdentifier = sys.value
        } else if let first = item.identifiers.first {
            selectedIdentifier = first.value
        } else {
            selectedIdentifier = "\(item.id)"
        }
    }

    private func renderActiveLabel() {
        let code = selectedIdentifier.isEmpty ? "\(item.id)" : selectedIdentifier
        let price = item.salePrice ?? item.minSalePrice
        self.labelImage = BarcodeLabelPrinter.shared.renderLabelImage(
            title: item.productModel.name,
            code: code,
            price: price
        )
    }
}
