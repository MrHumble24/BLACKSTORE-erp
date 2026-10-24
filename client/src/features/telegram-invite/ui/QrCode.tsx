import { useEffect, useRef } from 'react';
import { useQrSvg } from '@/shared/lib';

/** Renders the QR code for `value` by appending the SVG element to a container (no innerHTML). */
export function QrCode({ value }: { value: string | null }) {
  const ref = useRef<HTMLDivElement>(null);
  const svg = useQrSvg(value);

  useEffect(() => {
    ref.current?.replaceChildren(...(svg ? [svg] : []));
  }, [svg]);

  if (!svg) return null;
  return <div ref={ref} className="rounded-md bg-white p-2" />;
}
