import SwiftUI

/// Preview and print sheet for physical barcode price stickers (FR-15).
public struct BarcodePrintSheet: View {
    @Environment(\.dismiss) private var dismiss
    public let item: Item

    @State private var selectedIdentifier: String = ""
    @State private var copies: Int = 1
    @State private var isShowingShareSheet: Bool = false
    @State private var labelImage: UIImage? = nil

    public init(item: Item) {
        self.item = item
    }

    public var body: some View {
        NavigationStack {
            VStack(spacing: 20) {
                identifierPickerSection

                if let img = labelImage {
                    labelPreviewCard(image: img)
                } else {
                    ProgressView().padding(.top, 40)
                }

                copiesStepperSection

                Spacer()

                actionButtonsSection
            }
            .padding()
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
    }

    private var identifierPickerSection: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Shtrix-kod kodi:")
                .font(.caption)
                .foregroundStyle(.secondary)

            Picker("Kod", selection: $selectedIdentifier) {
                ForEach(item.identifiers) { idf in
                    Text("\(idf.type): \(idf.value)").tag(idf.value)
                }
            }
            .pickerStyle(.menu)
            .padding(8)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color(.secondarySystemBackground))
            .clipShape(RoundedRectangle(cornerRadius: 8))
        }
    }

    private func labelPreviewCard(image: UIImage) -> some View {
        VStack(spacing: 8) {
            Text("Yorliq ko'rinishi (50x30 mm)")
                .font(.caption2)
                .foregroundStyle(.secondary)

            Image(uiImage: image)
                .resizable()
                .scaledToFit()
                .frame(maxHeight: 200)
                .padding(10)
                .background(Color.white)
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .shadow(color: .black.opacity(0.1), radius: 8, x: 0, y: 3)
        }
    }

    private var copiesStepperSection: some View {
        Stepper("Nusxalar soni: \(copies)", value: $copies, in: 1...20)
            .padding(.horizontal)
    }

    private var actionButtonsSection: some View {
        VStack(spacing: 12) {
            Button {
                if let img = labelImage {
                    BarcodeLabelPrinter.shared.printLabel(
                        image: img,
                        jobName: "\(item.productModel.name) Label"
                    )
                    HapticManager.selection()
                }
            } label: {
                Label("AirPrint orqali chop etish", systemImage: "printer.fill")
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 4)
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.large)

            if let img = labelImage {
                ShareLink(item: Image(uiImage: img), preview: SharePreview("Yorliq", image: Image(uiImage: img))) {
                    Label("Rasmni saqlash / Ulashish", systemImage: "square.and.arrow.up")
                        .font(.subheadline)
                }
            }
        }
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
