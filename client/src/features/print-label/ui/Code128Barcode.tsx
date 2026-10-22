import { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

/** Renders a Code128 barcode as an inline SVG (the only jsbarcode usage, FR-15). */
export function Code128Barcode({ value }: { value: string }) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (svgRef.current) {
      JsBarcode(svgRef.current, value, {
        format: 'CODE128',
        width: 1.4,
        height: 40,
        displayValue: false,
        margin: 0,
        lineColor: '#000000',
        background: '#ffffff',
      });
    }
  }, [value]);

  return <svg ref={svgRef} className="print-label" />;
}
