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

/** Hook for scanning barcodes via the browser-native BarcodeDetector API. */
export function useCameraBarcodeScanner(
  open: boolean,
  onScan: (code: string) => void,
  onClose: () => void,
) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const onScanRef = useRef(onScan);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onScanRef.current = onScan;
    onCloseRef.current = onClose;
  });

  const isSupported = typeof window !== 'undefined' && 'BarcodeDetector' in window;

  useEffect(() => {
    if (!open || !videoRef.current || !window.BarcodeDetector) return;
    let active = true;
    let timer: number | null = null;
    const detector = new window.BarcodeDetector();

    async function initCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        if (!active) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;

        timer = window.setInterval(async () => {
          if (!videoRef.current || videoRef.current.readyState < 2 || !active) return;
          try {
            const barcodes = await detector.detect(videoRef.current);
            if (barcodes.length > 0 && barcodes[0]?.rawValue && active) {
              const code = barcodes[0].rawValue;
              active = false;
              if (timer !== null) clearInterval(timer);
              onCloseRef.current();
              onScanRef.current(code);
            }
          } catch {
            // Frame detection skipped
          }
        }, 300);
      } catch {
        toast.error(t('scan.cameraError'));
        onCloseRef.current();
      }
    }

    void initCamera();
    return () => {
      active = false;
      if (timer !== null) clearInterval(timer);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [open, t]);

  return { videoRef, isSupported };
}
