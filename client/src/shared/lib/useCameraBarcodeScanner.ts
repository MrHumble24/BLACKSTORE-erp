import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

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

const BARCODE_FORMATS = [
  'code_128',
  'ean_13',
  'ean_8',
  'code_39',
  'upc_a',
  'upc_e',
  'qr_code',
  'data_matrix',
];

function stopStream(stream: MediaStream | null) {
  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
  }
}

async function getCameraStream(): Promise<MediaStream> {
  if (!navigator?.mediaDevices?.getUserMedia) {
    throw new Error('Camera not supported by browser');
  }

  // 1. Try ideal environment camera (back camera on phone/tablet, falls back gracefully on laptops/Macs)
  try {
    return await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    });
  } catch {
    // 2. Fallback to basic video constraint (FaceTime camera on Mac, USB webcams)
    return await navigator.mediaDevices.getUserMedia({ video: true });
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
  }, 250);
}

async function attachCameraStream(
  video: HTMLVideoElement,
  detector: BarcodeDetectorInstance,
  onDetected: (code: string) => void,
  isCancelled: () => boolean,
): Promise<{ stream: MediaStream; timer: number } | null> {
  const stream = await getCameraStream();
  if (isCancelled()) {
    stopStream(stream);
    return null;
  }

  video.srcObject = stream;
  video.setAttribute('playsinline', 'true');
  video.setAttribute('muted', 'true');
  video.muted = true;

  try {
    await video.play();
  } catch {
    // Autoplay or already playing
  }

  const timer = startBarcodePolling(video, detector, onDetected);
  return { stream, timer };
}

function createBarcodeDetector(): BarcodeDetectorInstance | null {
  if (typeof window === 'undefined' || !window.BarcodeDetector) return null;
  try {
    return new window.BarcodeDetector({ formats: BARCODE_FORMATS });
  } catch {
    try {
      return new window.BarcodeDetector();
    } catch {
      return null;
    }
  }
}

function useEventCallbackRef<T>(val: T) {
  const ref = useRef(val);
  useEffect(() => {
    ref.current = val;
  });
  return ref;
}

/** Hook for scanning barcodes via the browser camera with robust Mac/mobile compatibility. */
export function useCameraBarcodeScanner(
  open: boolean,
  onScan: (code: string) => void,
  onClose: () => void,
) {
  const { t } = useTranslation();
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const onScanRef = useEventCallbackRef(onScan);
  const onCloseRef = useEventCallbackRef(onClose);
  const isSupported = typeof window !== 'undefined' && 'BarcodeDetector' in window;

  const videoRef = useCallback((node: HTMLVideoElement | null) => {
    setVideoElement(node);
  }, []);

  const retry = useCallback(() => {
    setRetryCount((prev) => prev + 1);
  }, []);

  useEffect(() => {
    if (!open || !videoElement || retryCount < 0) return;

    let cancelled = false;
    let activeTimer: number | null = null;

    void (async () => {
      setIsLoading(true);
      setError(null);
      try {
        const detector = createBarcodeDetector();
        if (!detector) throw new Error('Detector unavailable');

        const res = await attachCameraStream(
          videoElement,
          detector,
          (code) => {
            if (activeTimer !== null) clearInterval(activeTimer);
            onCloseRef.current();
            onScanRef.current(code);
          },
          () => cancelled,
        );

        if (cancelled) {
          if (res) stopStream(res.stream);
          return;
        }

        if (res) {
          streamRef.current = res.stream;
          activeTimer = res.timer;
          setIsLoading(false);
        }
      } catch (err: unknown) {
        if (cancelled) return;
        setIsLoading(false);
        const name = (err as { name?: string })?.name;
        if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
          setError(t('scan.cameraPermissionDenied'));
        } else if (name === 'NotFoundError') {
          setError(t('scan.cameraNotFound'));
        } else {
          setError(t('scan.cameraError'));
        }
      }
    })();

    return () => {
      cancelled = true;
      if (activeTimer !== null) clearInterval(activeTimer);
      stopStream(streamRef.current);
      streamRef.current = null;
      setIsLoading(false);
    };
  }, [open, videoElement, retryCount, t, onCloseRef, onScanRef]);

  return { videoRef, isSupported, isLoading, error, retry };
}
