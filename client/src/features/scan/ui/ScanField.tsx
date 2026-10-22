import { useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useItemByCode, SCAN_CODE_REGEX } from '@/entities/item';
import { getApiErrorStatus } from '@/shared/api';
import { CameraScanButton } from './CameraScanButton';

function ScanInput({
  value,
  setValue,
  onKeyDown,
  disabled,
  isPending,
  onCameraScan,
}: {
  value: string;
  setValue: (v: string) => void;
  onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
  disabled: boolean;
  isPending: boolean;
  onCameraScan: (code: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="relative flex items-center w-52 md:w-64">
      <div className="absolute left-2.5 flex items-center pointer-events-none text-steel">
        {isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-pricing-blue" />
        ) : (
          <Search className="h-3.5 w-3.5" />
        )}
      </div>
      <input
        type="text"
        maxLength={40}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={t('scan.placeholder')}
        disabled={disabled}
        className="h-8 w-full rounded-[980px] border border-hairline-silver bg-gallery-white pl-8 pr-8 text-xs text-ink placeholder:text-steel focus:border-pricing-blue focus:outline-none focus:ring-1 focus:ring-pricing-blue/20 transition-all tracking-[-0.01em]"
      />
      <div className="absolute right-1 flex items-center">
        <CameraScanButton onScan={onCameraScan} />
      </div>
    </div>
  );
}

/** Scan input in header for barcode / IMEI scanning and quick lookup. */
export function ScanField() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [value, setValue] = useState('');
  const { mutate: lookupItem, isPending } = useItemByCode();

  const handleLookup = (codeToScan: string) => {
    const trimmed = codeToScan.trim();
    if (!trimmed || !SCAN_CODE_REGEX.test(trimmed)) return;

    lookupItem(trimmed, {
      onSuccess: (item) => {
        setValue('');
        navigate(`/items/${item.id}`);
      },
      onError: (err) => {
        setValue('');
        if (getApiErrorStatus(err) === 404) {
          toast.error(t('scan.notFound'));
        } else {
          toast.error(t('common.error'));
        }
      },
    });
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleLookup(value);
    }
  };

  const handleCameraScan = (code: string) => {
    setValue(code);
    handleLookup(code);
  };

  return (
    <ScanInput
      value={value}
      setValue={setValue}
      onKeyDown={handleKeyDown}
      disabled={isPending}
      isPending={isPending}
      onCameraScan={handleCameraScan}
    />
  );
}
