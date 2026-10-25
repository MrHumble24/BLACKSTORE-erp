import UIKit

/// Opens AirPrint for a label PDF and asks the printer for paper matching the PDF page size;
/// on iPad the print popover is anchored to the button's frame.
final class LabelPrinter: NSObject, UIPrintInteractionControllerDelegate {
    static let shared = LabelPrinter()
    private var pageSize = CGSize.zero

    /// Shows the system print sheet for `fileURL`; `anchor` is the print button's frame in window coordinates.
    func print(fileURL: URL, pageSize: CGSize, jobName: String, anchor: CGRect) {
        self.pageSize = pageSize
        let info = UIPrintInfo.printInfo()
        info.outputType = .grayscale
        info.jobName = jobName
        let controller = UIPrintInteractionController.shared
        controller.printInfo = info
        controller.printingItem = fileURL
        controller.delegate = self
        if UIDevice.current.userInterfaceIdiom == .pad, let view = topView() {
            controller.present(from: view.convert(anchor, from: nil), in: view, animated: true)
        } else {
            controller.present(animated: true)
        }
    }

    func printInteractionController(_ controller: UIPrintInteractionController,
                                    choosePaper paperList: [UIPrintPaper]) -> UIPrintPaper {
        UIPrintPaper.bestPaper(forPageSize: pageSize, withPapersFrom: paperList)
    }

    /// View of the top-most presented controller (the labels sheet itself).
    private func topView() -> UIView? {
        let window = UIApplication.shared.connectedScenes
            .compactMap { ($0 as? UIWindowScene)?.keyWindow }
            .first
        var top = window?.rootViewController
        while let presented = top?.presentedViewController { top = presented }
        return top?.view
    }
}
