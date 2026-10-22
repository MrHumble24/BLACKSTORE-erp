import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { ScanLine } from 'lucide-react';
import { ScanCodeInput } from '@/shared/ui';
import { getApiErrorMessage } from '@/shared/api';
import { SCAN_CODE_REGEX } from '@/entities/item';
import { useScanStockCount, ScanStatusBadge, type StockCountScan } from '@/entities/stock-count';

/** A scan paired with a stable client-only key (DUPLICATE scans repeat the same server id). */
interface KeyedScan {
  key: number;
  scan: StockCountScan;
}

/** The list of scans made in this session, newest first, each with its status badge. */
function SessionScans({ scans }: { scans: KeyedScan[] }) {
  if (scans.length === 0) return null;
  return (
    <div className="space-y-1.5">
      {scans.map(({ key, scan }) => (
        <div
          key={key}
          className="flex items-center justify-between rounded-2xl border border-hairline-silver/60 bg-studio-mist/40 px-3 py-2"
        >
          <span className="text-xs text-ink">
            <span className="font-medium">{scan.code}</span>
            {scan.item && <span className="text-slate"> · {scan.item.productModel.name}</span>}
          </span>
          <ScanStatusBadge status={scan.status} />
        </div>
      ))}
    </div>
  );
}

/** Always-focused scan input for an open count; each Enter records a scan and prepends it. */
export function CountScanPanel({ countId }: { countId: number }) {
  const { t } = useTranslation();
  const [code, setCode] = useState('');
  const [scans, setScans] = useState<KeyedScan[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const keyRef = useRef(0);
  const { mutate: scan, isPending } = useScanStockCount(countId);

  const submit = (raw: string) => {
    if (isPending) return;
    const normalized = raw.trim().toUpperCase();
    if (!normalized || !SCAN_CODE_REGEX.test(normalized)) return;
    scan(normalized, {
      onSuccess: (result) => {
        keyRef.current += 1;
        setScans((prev) => [{ key: keyRef.current, scan: result }, ...prev]);
        setCode('');
        inputRef.current?.focus();
      },
      onError: (err) => toast.error(getApiErrorMessage(err) ?? t('common.error')),
    });
  };

  return (
    <section className="rounded-[28px] border border-hairline-silver/70 bg-gallery-white p-6 space-y-4">
      <div className="flex items-center gap-2 text-base font-semibold text-ink">
        <ScanLine className="h-4 w-4 text-pricing-blue" />
        {t('stockCount.scanPanelTitle')}
      </div>
      <ScanCodeInput
        id="count-scan"
        label={t('stockCount.scanInputLabel')}
        value={code}
        onChange={setCode}
        onSubmit={submit}
        inputRef={inputRef}
        autoFocus
        placeholder={t('stockCount.scanPlaceholder')}
      />
      <SessionScans scans={scans} />
    </section>
  );
}
