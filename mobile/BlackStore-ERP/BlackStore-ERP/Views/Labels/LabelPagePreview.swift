import SwiftUI

/// One printed page in the preview list, rendered in the background by the same drawing code as
/// the PDF. The page stays white in dark mode because it is paper.
struct LabelPagePreview: View {
    let page: Int
    let pageCount: Int
    let labels: [PrintLabel]
    let layout: LabelSheetLayout

    @Environment(\.displayScale) private var displayScale
    @State private var width: CGFloat = 0
    @State private var image: UIImage?

    var body: some View {
        VStack(spacing: 8) {
            Color.white
                .aspectRatio(layout.paper.pageSize.width / layout.paper.pageSize.height, contentMode: .fit)
                .overlay {
                    if let image { Image(uiImage: image).resizable().scaledToFit() } else { ProgressView().tint(.gray) }
                }
                .overlay { Rectangle().strokeBorder(Color(.separator), lineWidth: 0.5) }
                .onGeometryChange(for: CGFloat.self) { $0.size.width } action: { width = $0 }
            Text("\(page + 1) / \(pageCount)")
                .font(.footnote)
                .monospacedDigit()
                .foregroundStyle(.secondary)
        }
        .padding(.vertical, 8)
        .task(id: width) { await render() }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Sahifa \(page + 1) / \(pageCount), \(labelsOnPage) ta yorliq")
        .accessibilityAddTraits(.isImage)
    }

    private var labelsOnPage: Int {
        min(layout.perPage, labels.count - page * layout.perPage)
    }

    /// Draws the page bitmap at the on-screen pixel width off the main thread.
    private func render() async {
        guard width > 0 else { return }
        let page = page, labels = labels, layout = layout, pixels = width * displayScale
        let rendered = await Task.detached(priority: .userInitiated) {
            LabelDrawing.pageImage(page, labels: labels, layout: layout, width: pixels)
        }.value
        if !Task.isCancelled { image = rendered }
    }
}
