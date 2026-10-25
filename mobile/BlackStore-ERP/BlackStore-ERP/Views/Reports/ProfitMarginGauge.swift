import SwiftUI

/// Half-circle gauge of gross margin (web ProfitMarginGauge): the arc fills 0–100 %, the previous
/// period sits as a tick on the arc, the true figure (even below 0 or above 100) in the middle.
struct ProfitMarginGauge: View {
    let totals: ProfitTotals
    let previous: ProfitTotals?

    private static let height: CGFloat = 180
    private static let lineWidth: CGFloat = 14
    private var margin: Double? { ProfitCharts.margin(totals.profitDouble, of: totals.salesDouble) }
    private var previousMargin: Double? { previous.flatMap { ProfitCharts.margin($0.profitDouble, of: $0.salesDouble) } }

    var body: some View {
        ChartSection(title: "Yalpi marja", caption: "Yalpi foyda savdoning necha foizi") {
            if let margin {
                gauge(margin)
            } else {
                ChartEmpty(height: Self.height)
            }
        }
    }

    private func gauge(_ margin: Double) -> some View {
        VStack(spacing: 4) {
            GeometryReader { geo in
                let diameter = min(geo.size.width, (geo.size.height - Self.lineWidth) * 2)
                ZStack(alignment: .bottom) {
                    arc(to: 1).stroke(ChartPalette.track, style: stroke)
                    arc(to: clamp(margin)).stroke(margin >= 0 ? ChartPalette.profit : ChartPalette.expense, style: stroke)
                    if let previousMargin {
                        GaugeTick(fraction: clamp(previousMargin), inset: Self.lineWidth / 2, reach: Self.lineWidth / 2 + 4)
                            .stroke(Color.primary, style: StrokeStyle(lineWidth: 2.5, lineCap: .round))
                    }
                    figure(margin)
                }
                .frame(width: diameter, height: diameter / 2 + Self.lineWidth / 2, alignment: .bottom)
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottom)
            }
            .frame(height: Self.height - 24)
            Text(previousMargin.map { "O'tgan davr \(ChartFormat.percent($0))" } ?? " ")
                .font(.caption).foregroundStyle(.secondary).monospacedDigit()
                .frame(height: 20)
        }
        .frame(height: Self.height)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Yalpi marja \(ChartFormat.percent(margin))" +
                            (previousMargin.map { ", o'tgan davr \(ChartFormat.percent($0))" } ?? ""))
    }

    private var stroke: StrokeStyle { StrokeStyle(lineWidth: Self.lineWidth, lineCap: .round) }

    /// Margin as 0…1 of the arc.
    private func clamp(_ pct: Double) -> Double { min(max(pct / 100, 0), 1) }

    /// Upper half circle from the left end (9 o'clock) to `fraction` of the way to the right end.
    private func arc(to fraction: Double) -> some Shape {
        GaugeArc(fraction: fraction).inset(by: Self.lineWidth / 2)
    }

    private func figure(_ margin: Double) -> some View {
        VStack(spacing: 0) {
            Text(ChartFormat.percent(margin)).font(.title.weight(.bold)).monospacedDigit()
            Text("Sof foyda \(APIConfig.formatMoney(totals.netProfitDouble))")
                .font(.caption).foregroundStyle(.secondary).monospacedDigit()
                .minimumScaleFactor(0.7).lineLimit(1)
        }
        .padding(.bottom, 2)
    }
}

/// Upper semicircle path filled left to right up to `fraction`, centred on the bottom edge.
private struct GaugeArc: InsettableShape {
    let fraction: Double
    var inset: CGFloat = 0

    func path(in rect: CGRect) -> Path {
        let radius = rect.width / 2 - inset
        let center = CGPoint(x: rect.midX, y: rect.maxY - inset)
        var path = Path()
        path.addArc(center: center, radius: radius, startAngle: .degrees(180),
                    endAngle: .degrees(180 + 180 * fraction), clockwise: false)
        return path
    }

    func inset(by amount: CGFloat) -> GaugeArc {
        GaugeArc(fraction: fraction, inset: inset + amount)
    }
}

/// A short radial line across the arc at `fraction`, reaching `reach` either side of the arc centre line.
private struct GaugeTick: Shape {
    let fraction: Double
    let inset: CGFloat
    let reach: CGFloat

    func path(in rect: CGRect) -> Path {
        let radius = rect.width / 2 - inset
        let center = CGPoint(x: rect.midX, y: rect.maxY - inset)
        let angle = Double.pi * (1 - fraction)
        let point = { (r: CGFloat) in CGPoint(x: center.x + r * cos(angle), y: center.y - r * sin(angle)) }
        var path = Path()
        path.move(to: point(radius - reach))
        path.addLine(to: point(radius + reach))
        return path
    }
}
