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

function stopStream(stream: MediaStream | null) {
  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
  }
}

function startBarcodePolling(
  video: HTMLVideoElement,
  detector: BarcodeDetectorInstance,
  onDetected: (code: string) => void,
): number {
  return window.setInterval(async () => {
    if (video.readyState < 2) return;
    try {
      const barcodes = await detector.detect(video);
      if (barcodes.length > 0 && barcodes[0]?.rawValue) {
        onDetected(barcodes[0].rawValue);
      }
    } catch {
      // Frame skipped
    }
  }, 300);
}

async function attachCameraStream(
  video: HTMLVideoElement,
  detector: BarcodeDetectorInstance,
  onDetected: (code: string) => void,
  onError: () => void,
  isCancelled: () => boolean,
): Promise<{ stream: MediaStream; timer: number } | null> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    if (isCancelled()) {
      stopStream(stream);
      return null;
    }
    video.srcObject = stream;
    const timer = startBarcodePolling(video, detector, onDetected);
    return { stream, timer };
  } catch {
    if (!isCancelled()) onError();
    return null;
  }
}

function useEventCallbackRef<T>(val: T) {
  const ref = useRef(val);
  useEffect(() => {
    ref.current = val;
  });
  return ref;
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
  const onScanRef = useEventCallbackRef(onScan);
  const onCloseRef = useEventCallbackRef(onClose);
  const isSupported = typeof window !== 'undefined' && 'BarcodeDetector' in window;

  useEffect(() => {
    if (!open || !videoRef.current || !window.BarcodeDetector) return;
    let cancelled = false;
    let activeTimer: number | null = null;
    const detector = new window.BarcodeDetector();

    void attachCameraStream(
      videoRef.current,
      detector,
      (code) => {
        if (activeTimer !== null) clearInterval(activeTimer);
        onCloseRef.current();
        onScanRef.current(code);
      },
      () => {
        toast.error(t('scan.cameraError'));
        onCloseRef.current();
      },
      () => cancelled,
    ).then((res) => {
      if (res) {
        streamRef.current = res.stream;
        activeTimer = res.timer;
      }
    });

    return () => {
      cancelled = true;
      if (activeTimer !== null) clearInterval(activeTimer);
      stopStream(streamRef.current);
      streamRef.current = null;
    };
  }, [open, t, onCloseRef, onScanRef]);

  return { videoRef, isSupported };
}
