import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ImagePlus, Trash2 } from 'lucide-react';
import { Button, Label } from '@/shared/ui';

interface ReceiptLogoFieldProps {
  logo: string;
  onPick: (file: File) => void;
  onRemove: () => void;
}

/** Logo picker: shows the current image (if any) with upload and remove controls. */
export function ReceiptLogoField({ logo, onPick, onRemove }: ReceiptLogoFieldProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-1.5">
      <Label>{t('receiptSettings.logo')}</Label>
      <div className="flex items-center gap-3">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-hairline-silver/70 bg-control-gray/30">
          {logo ? (
            <img src={logo} alt="" className="h-full w-full object-contain" />
          ) : (
            <ImagePlus className="h-5 w-5 text-slate" />
          )}
        </div>
        <div className="space-y-1">
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
              {t('receiptSettings.logoChoose')}
            </Button>
            {logo && (
              <Button type="button" variant="ghost" size="sm" className="text-launch-orange" onClick={onRemove}>
                <Trash2 className="mr-1 h-3.5 w-3.5" />
                {t('receiptSettings.logoRemove')}
              </Button>
            )}
          </div>
          <p className="text-[11px] text-slate">{t('receiptSettings.logoHelp')}</p>
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onPick(file);
          e.target.value = '';
        }}
      />
    </div>
  );
}
