import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Camera, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { useCameraBarcodeScanner } from '@/shared/lib';
import { Button } from './button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './dialog';

interface CameraScanButtonProps {
  onScan: (code: string) => void;
}

interface ScannerViewportProps {
  videoRef: (node: HTMLVideoElement | null) => void;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
}

function ScannerViewport({ videoRef, isLoading, error, onRetry }: ScannerViewportProps) {
  const { t } = useTranslation();

  return (
    <div className="overflow-hidden rounded-2xl bg-ink aspect-video relative flex items-center justify-center shadow-inner">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
      />
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-ink/80 text-paper z-10">
          <Loader2 className="h-6 w-6 animate-spin text-pricing-blue" />
          <span className="text-xs font-medium">{t('scan.cameraConnecting')}</span>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 bg-ink/90 text-paper text-center z-20">
          <AlertCircle className="h-7 w-7 text-launch-orange" />
          <p className="text-xs text-paper/80 max-w-xs">{error}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="h-8 gap-1.5 text-xs bg-paper/10 border-paper/20 hover:bg-paper/20 text-paper cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {t('scan.retry')}
          </Button>
        </div>
      )}
      {!isLoading && !error && (
        <>
          <div className="absolute inset-8 border-2 border-pricing-blue/60 rounded-xl pointer-events-none animate-pulse" />
          <div className="absolute bottom-3 left-0 right-0 text-center pointer-events-none">
            <span className="text-[11px] font-medium bg-ink/75 text-paper/90 px-3 py-1 rounded-full backdrop-blur-sm">
              {t('scan.pointCameraAtBarcode')}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

/** Camera barcode scanner button opening a video dialog using browser BarcodeDetector. */
export function CameraScanButton({ onScan }: CameraScanButtonProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const { videoRef, isSupported, isLoading, error, retry } = useCameraBarcodeScanner(
    open,
    onScan,
    () => setOpen(false),
  );

  if (!isSupported) return null;

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        className="h-7 w-7 text-steel hover:text-ink hover:bg-transparent"
        title={t('scan.cameraButton')}
      >
        <Camera className="h-4 w-4" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md p-6">
          <DialogHeader>
            <DialogTitle>{t('scan.cameraTitle')}</DialogTitle>
          </DialogHeader>
          <ScannerViewport
            videoRef={videoRef}
            isLoading={isLoading}
            error={error}
            onRetry={retry}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
