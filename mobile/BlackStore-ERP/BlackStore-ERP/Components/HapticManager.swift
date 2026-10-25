import UIKit

/// Generates tactile haptic feedback for user interactions and barcode scans.
@MainActor
public enum HapticManager {
    /// Light tap on button touch.
    public static func light() {
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
    }

    /// Pronounced medium tap.
    public static func medium() {
        UIImpactFeedbackGenerator(style: .medium).impactOccurred()
    }

    /// Selection change click.
    public static func selection() {
        UISelectionFeedbackGenerator().selectionChanged()
    }

    /// Pronounced tap on barcode or IMEI detected.
    public static func scanSuccess() {
        UIImpactFeedbackGenerator(style: .medium).impactOccurred()
    }

    /// Success vibration on sale completed.
    public static func success() {
        UINotificationFeedbackGenerator().notificationOccurred(.success)
    }

    /// Warning vibration on rule violation or duplicate.
    public static func warning() {
        UINotificationFeedbackGenerator().notificationOccurred(.warning)
    }

    /// Error vibration on failed request.
    public static func error() {
        UINotificationFeedbackGenerator().notificationOccurred(.error)
    }
}

