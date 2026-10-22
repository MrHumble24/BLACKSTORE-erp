import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/shared/api';
import { useItem, useGenerateSystemCode } from '@/entities/item';
import { getSystemCode } from '../model/label';
import { Code128Barcode } from './Code128Barcode';

/** Generates the BS-XXXXXX code on screen when the item doesn't have one yet (FR-15). */
function useEnsureSystemCode(itemId: number) {
  const { t } = useTranslation();
  const { data: item } = useItem(itemId);
  const hasCode = Boolean(getSystemCode(item));
  const { mutate: generateCode, isIdle } = useGenerateSystemCode();

  useEffect(() => {
    // One generation per visit: isIdle turns false after the first call, so item
    // refetches cannot fire a second POST for a code the server would return anyway.
    if (!item || hasCode || !isIdle) return;
    generateCode(itemId, {
      onError: (err) => toast.error(getApiErrorMessage(err) ?? t('common.error')),
    });
  }, [item, hasCode, itemId, generateCode, isIdle, t]);

  return { item, hasCode };
}

/** Screen-only back hint; never printed. */
function LabelScreenHint({ hasCode }: { hasCode: boolean }) {
  const { t } = useTranslation();
  return (
    <p className="print:hidden text-xs text-slate mb-4">
      {hasCode ? t('labels.hint') : t('labels.generating')}
    </p>
  );
}

/**
 * 50×30 mm thermal label (FR-15): product model name, Code128 system code and the code
 * as text. Rendered outside the app shell and prints itself once the code is available.
 */
export function LabelPage() {
  const { id } = useParams<{ id: string }>();
  const itemId = Number(id);
  const { item, hasCode } = useEnsureSystemCode(itemId);
  const code = getSystemCode(item);
  const { t } = useTranslation();

  useEffect(() => {
    // Print once the code string becomes available; a refetch with the same code
    // is a no-op because the dependency value does not change.
    if (code) window.print();
  }, [code]);

  if (!item) {
    return <div className="p-6 text-xs text-slate">{t('common.loading')}</div>;
  }

  return (
    <div className="p-6">
      <LabelScreenHint hasCode={hasCode} />
      <div className="print-label w-[50mm] h-[30mm] flex flex-col items-center justify-between py-2 px-3 bg-white text-black font-sans">
        <p className="text-[11px] font-semibold leading-tight text-center line-clamp-2">
          {item.productModel.name}
        </p>
        {code && (
          <div className="flex flex-col items-center gap-0.5">
            <Code128Barcode value={code} />
            <span className="text-[10px] font-medium tracking-tight">{code}</span>
          </div>
        )}
      </div>
    </div>
  );
}
