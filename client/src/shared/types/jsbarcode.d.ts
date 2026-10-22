/** Minimal ambient declaration for jsbarcode: we only render Code128 SVG barcodes. */
declare module 'jsbarcode' {
  interface JsBarcodeOptions {
    format?: string;
    width?: number;
    height?: number;
    displayValue?: boolean;
    fontSize?: number;
    margin?: number;
    lineColor?: string;
    background?: string;
  }

  export default function JsBarcode(
    element: SVGElement | HTMLElement | string,
    text: string,
    options?: JsBarcodeOptions,
  ): void;
}
