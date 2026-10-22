import { useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

interface DetectedBarcode {
  rawValue: string;
}

interface BarcodeDetectorInstance {
  detect: (source: ImageBitmapSource) => Promise<DetectedBarcode[]>;
}

declare global {
  interface Window {
    BarcodeDetector?: {
      new (options?: { formats?: string[] }): BarcodeDetectorInstance;
    };
  }
}

type Ref<T> = React.RefObject<T | null>;

/** Opens the camera, runs native BarcodeDetector on frames and calls back on the first hit. */
async function startBarcodeScanning(
  videoRef: Ref<HTMLVideoElement>,
  onScanRef: Ref<(code: string) => void>,
  onCloseRef: Ref<() => void>,
  onError: () => void,
): Promise<() => void> {
  if (!window.BarcodeDetector) return () => {};
  const detector = new window.BarcodeDetector();
  let active = true;
  let timer: number | null = null;
  let stream: MediaStream | null = null;

  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' },
    });
    if (!active) {
      stream.getTracks().forEach((track) => track.stop());
      return () => {};
    }
    if (videoRef.current) videoRef.current.srcObject = stream;

    timer = window.setInterval(async () => {
      if (!videoRef.current || videoRef.current.readyState < 2 || !active) return;
      try {
        const barcodes = await detector.detect(videoRef.current);
        if (barcodes.length > 0 && barcodes[0]?.rawValue && active) {
          const code = barcodes[0].rawValue;
          active = false;
          if (timer !== null) clearInterval(timer);
          onCloseRef.current?.();
          onScanRef.current?.(code);
        }
      } catch {
        // Frame detection skipped
      }
    }, 300);
  } catch {
    if (!active) return () => {};
    active = false;
    onError();
  }

  return () => {
    active = false;
    if (timer !== null) clearInterval(timer);
    stream?.getTracks().forEach((track) => track.stop());
  };
}

/** Hook for scanning barcodes via the browser-native BarcodeDetector API. */
export function useCameraBarcodeScanner(
  open: boolean,
  onScan: (code: string) => void,
  onClose: () => void,
) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const onScanRef = useRef(onScan);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onScanRef.current = onScan;
    onCloseRef.current = onClose;
  });

  const isSupported = typeof window !== 'undefined' && 'BarcodeDetector' in window;

  useEffect(() => {
    if (!open || !videoRef.current) return;
    let cleanup = () => {};
    let cancelled = false;

    void startBarcodeScanning(videoRef, onScanRef, onCloseRef, () => {
      toast.error(t('scan.cameraError'));
      onCloseRef.current?.();
    }).then((stop) => {
      if (cancelled) stop();
      else cleanup = stop;
    });

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [open, t]);

  return { videoRef, isSupported };
}
