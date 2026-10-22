import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Camera } from 'lucide-react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui';
import { useCameraBarcodeScanner } from '../lib/useCameraBarcodeScanner';

interface CameraScanButtonProps {
  onScan: (code: string) => void;
}

/** Camera barcode scanner using browser-native BarcodeDetector API. */
export function CameraScanButton({ onScan }: CameraScanButtonProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const { videoRef, isSupported } = useCameraBarcodeScanner(
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
          <div className="overflow-hidden rounded-2xl bg-ink aspect-video relative flex items-center justify-center">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-8 border-2 border-pricing-blue/60 rounded-xl pointer-events-none" />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
