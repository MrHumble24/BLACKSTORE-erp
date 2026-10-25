import SwiftUI
import UIKit

/// Report chart colours, mirroring client/src/pages/reports/ui/chartPalette.ts so web and iOS read as
/// one system. The dark set is lifted (orange darkened to #d9731c) so every hue passes the dataviz
/// palette validator on dark surfaces.
enum ChartPalette {
    static let sales = dynamic(light: 0x0071E3, dark: 0x2F8DED)
    static let profit = dynamic(light: 0x059669, dark: 0x22A06F)
    static let share = dynamic(light: 0x7C3AED, dark: 0x8F78EA)
    static let expense = dynamic(light: 0xB64400, dark: 0xD9731C)
    static let teal = dynamic(light: 0x0D9488, dark: 0x1FA89C)
    /// Cost and the folded "Boshqalar" slice.
    static let neutral = dynamic(light: 0x64748B, dark: 0x8B95A5)
    static let track = Color(.systemFill)
    static let grid = Color(.separator)
    /// Totals (waterfall) use the text ink, not a hue.
    static let ink = Color.primary

    /// Fixed categorical order for entity slices; never cycled. A nil slot (6th and later) is neutral.
    static func categorical(_ index: Int?) -> Color {
        let slots = [sales, profit, share, expense, teal]
        guard let index, slots.indices.contains(index) else { return neutral }
        return slots[index]
    }

    private static func dynamic(light: UInt32, dark: UInt32) -> Color {
        Color(UIColor { $0.userInterfaceStyle == .dark ? rgb(dark) : rgb(light) })
    }

    private static func rgb(_ hex: UInt32) -> UIColor {
        UIColor(red: CGFloat((hex >> 16) & 0xFF) / 255, green: CGFloat((hex >> 8) & 0xFF) / 255,
                blue: CGFloat(hex & 0xFF) / 255, alpha: 1)
    }
}
