import { useQuery } from '@tanstack/react-query';

/**
 * Renders `value` as a 200px QR code SVG element (or `null` while loading / when empty).
 * `@zxing/browser` is lazy-imported so the QR writer only ships to pages that open it.
 * The `useQuery` wrapper caches a local computation (not server data) per value, so
 * reopening the dialog is instant.
 */
export function useQrSvg(value: string | null): SVGSVGElement | null {
  const { data } = useQuery({
    queryKey: ['qr-svg', value],
    enabled: Boolean(value),
    staleTime: Infinity,
    queryFn: async () => {
      const { BrowserQRCodeSvgWriter } = await import('@zxing/browser');
      return new BrowserQRCodeSvgWriter().write(value ?? '', 200, 200);
    },
  });
  return data ?? null;
}
