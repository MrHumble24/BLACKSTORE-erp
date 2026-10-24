import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';

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
  'code_128', 'ean_13', 'ean_8', 'code_39',
  'upc_a', 'upc_e', 'qr_code', 'data_matrix',
];

/** Stop every track on a media stream. */
function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

/** Back camera on phones, graceful fallback to any camera elsewhere. */
async function getCameraStream(): Promise<MediaStream> {
  try {
    return await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
    });
  } catch {
    return await navigator.mediaDevices.getUserMedia({ video: true });
  }
}

/** Show the live stream in the element (iOS needs playsinline + muted). */
async function attachStream(video: HTMLVideoElement, stream: MediaStream) {
  video.srcObject = stream;
  video.setAttribute('playsinline', 'true');
  video.muted = true;
  try {
    await video.play();
  } catch {
    // Autoplay rejected or already playing.
  }
}

/** Native BarcodeDetector instance, or null when the browser lacks it (e.g. iOS Safari). */
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

type Stop = () => void;

/**
 * Opens the camera and starts decoding. Uses the native BarcodeDetector when present
 * (Android/desktop Chrome); otherwise lazy-loads ZXing so iPhones can scan too.
 * Returns a stop() that releases the camera and the decoder.
 */
async function startScanner(video: HTMLVideoElement, onDetected: (code: string) => void): Promise<Stop> {
  const native = createBarcodeDetector();
  if (native) {
    const stream = await getCameraStream();
    await attachStream(video, stream);
    const timer = window.setInterval(async () => {
      if (video.readyState < 2) return;
      try {
        const codes = await native.detect(video);
        if (codes[0]?.rawValue) onDetected(codes[0].rawValue);
      } catch {
        // Skip unreadable frame.
      }
    }, 250);
    return () => {
      clearInterval(timer);
      stopStream(stream);
    };
  }

  // iOS fallback: ZXing opens the camera and decodes from the video element itself.
  const { BrowserMultiFormatReader } = await import('@zxing/browser');
  const reader = new BrowserMultiFormatReader();
  const controls = await reader.decodeFromConstraints(
    { video: { facingMode: { ideal: 'environment' } } },
    video,
    (result) => {
      if (result) onDetected(result.getText());
    },
  );
  return () => controls.stop();
}

/** Maps a getUserMedia error to a translated message. */
function cameraErrorMessage(err: unknown, t: TFunction): string {
  const name = (err as { name?: string })?.name;
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') return t('scan.cameraPermissionDenied');
  if (name === 'NotFoundError') return t('scan.cameraNotFound');
  return t('scan.cameraError');
}

function useEventCallbackRef<T>(val: T) {
  const ref = useRef(val);
  useEffect(() => {
    ref.current = val;
  });
  return ref;
}

/** Scans barcodes via the camera; works on Android/desktop (native) and iPhone (ZXing fallback). */
export function useCameraBarcodeScanner(
  open: boolean,
  onScan: (code: string) => void,
  onClose: () => void,
) {
  const { t } = useTranslation();
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const onScanRef = useEventCallbackRef(onScan);
  const onCloseRef = useEventCallbackRef(onClose);
  // The button is useful only when a camera is reachable (secure context with getUserMedia).
  const isSupported =
    typeof navigator !== 'undefined' && typeof navigator.mediaDevices?.getUserMedia === 'function';

  const videoRef = useCallback((node: HTMLVideoElement | null) => setVideoElement(node), []);
  const retry = useCallback(() => setRetryCount((prev) => prev + 1), []);

  useEffect(() => {
    // retryCount is in the deps so retry() re-runs this effect; the guard keeps it referenced.
    if (!open || !videoElement || retryCount < 0) return;

    let cancelled = false;
    let stop: Stop | null = null;
    let done = false;

    void (async () => {
      setIsLoading(true);
      setError(null);
      try {
        stop = await startScanner(videoElement, (code) => {
          if (done) return;
          done = true;
          onCloseRef.current();
          onScanRef.current(code);
        });
        if (cancelled) {
          stop();
          return;
        }
        setIsLoading(false);
      } catch (err: unknown) {
        if (cancelled) return;
        setIsLoading(false);
        setError(cameraErrorMessage(err, t));
      }
    })();

    return () => {
      cancelled = true;
      stop?.();
      setIsLoading(false);
    };
  }, [open, videoElement, retryCount, t, onCloseRef, onScanRef]);

  return { videoRef, isSupported, isLoading, error, retry };
}
