import SwiftUI
import Charts

/// Sales share by a grouping (web ProfitShareDonut): top 5 in the fixed palette order, the rest in
/// one neutral "Boshqalar" slice; total in the centre, legend with name and share.
struct ProfitShareDonut: View {
    let title: String
    let caption: String
    let groups: [ProfitGroup]
    @Environment(\.dynamicTypeSize) private var typeSize

    private static let height: CGFloat = 180
    private var slices: [ShareSlice] {
        ProfitCharts.slices(groups.map { ($0.name, $0.salesDouble) }, otherName: "Boshqalar")
    }

    var body: some View {
        ChartSection(title: title, caption: caption) {
            let slices = slices
            if slices.isEmpty {
                ChartEmpty(height: Self.height)
            } else {
                // Side by side on a phone; stacked at accessibility sizes so names never truncate.
                let layout = typeSize >= .accessibility1 ? AnyLayout(VStackLayout(spacing: 16))
                                                         : AnyLayout(HStackLayout(spacing: 20))
                layout {
                    donut(slices)
                    legend(slices)
                }
                .accessibilityElement(children: .ignore)
                .accessibilityLabel("\(title): " + slices.map { "\($0.name) \(ChartFormat.percent($0.share))" }.joined(separator: ", "))
            }
        }
    }

    private func donut(_ slices: [ShareSlice]) -> some View {
        Chart(slices) { slice in
            SectorMark(angle: .value("Savdo", slice.value), innerRadius: .ratio(0.64), angularInset: 1)
                .cornerRadius(2)
                .foregroundStyle(ChartPalette.categorical(slice.colorIndex))
        }
        .chartLegend(.hidden)
        .chartBackground { proxy in
            GeometryReader { geo in
                if let plot = proxy.plotFrame {
                    let frame = geo[plot]
                    centre(slices).frame(maxWidth: frame.width * 0.55).position(x: frame.midX, y: frame.midY)
                }
            }
        }
        .frame(width: Self.height - 30, height: Self.height - 30)
        .frame(height: Self.height)
    }

    private func centre(_ slices: [ShareSlice]) -> some View {
        VStack(spacing: 0) {
            Text("Savdo").font(.caption2).foregroundStyle(.secondary)
            Text(ChartFormat.shortMoney(slices.reduce(0) { $0 + $1.value }))
                .font(.subheadline.weight(.semibold)).monospacedDigit()
        }
        .lineLimit(1)
        .minimumScaleFactor(0.5)
    }

    private func legend(_ slices: [ShareSlice]) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            ForEach(slices) { slice in
                HStack(spacing: 8) {
                    Circle().fill(ChartPalette.categorical(slice.colorIndex)).frame(width: 8, height: 8)
                    Text(slice.name).foregroundStyle(.primary).lineLimit(typeSize >= .accessibility1 ? nil : 1)
                    Spacer(minLength: 8)
                    Text(ChartFormat.percent(slice.share)).foregroundStyle(.secondary).monospacedDigit()
                }
                .font(.footnote)
            }
        }
        .frame(maxWidth: .infinity)
    }
}
