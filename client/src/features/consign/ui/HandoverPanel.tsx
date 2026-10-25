import { useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { ArrowRight } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Button, ScanCodeInput, FormError } from '@/shared/ui';
import { normalizeMoney, isStrictlyPositiveMoney, useSubmitWithError } from '@/shared/lib';
import { useItemByCode } from '@/entities/item';
import { useCreateConsignment } from '@/entities/consignment';
import { HandoverHeaderFields } from './HandoverHeaderFields';
import { HandoverItemsTable } from './HandoverItemsTable';
import type { HandoverLine } from '../model/types';
import { usePrefillLines, parseItemIds } from '../model/usePrefillLines';

function useHandoverScan(lines: HandoverLine[], setLines: React.Dispatch<React.SetStateAction<HandoverLine[]>>) {
  const { t } = useTranslation();
  const [scanValue, setScanValue] = useState('');
  const itemByCode = useItemByCode();

  const handleScan = async (code: string) => {
    const trimmed = code.trim();
    if (!trimmed) return;
    try {
      const item = await itemByCode.mutateAsync(trimmed);
      if (item.status !== 'IN_STOCK') {
        toast.error(t('consign.onlyInStockAllowed'));
        return;
      }
      if (lines.some((l) => l.item.id === item.id)) {
        toast.error(t('consign.alreadyAdded'));
        return;
      }
      setLines((prev) => [...prev, { item, minPrice: item.salePrice ?? '' }]);
      setScanValue('');
    } catch {
      toast.error(t('consign.itemNotFound'));
    }
  };

  return { scanValue, setScanValue, handleScan, isPending: itemByCode.isPending };
}

function useHandoverForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [partnerId, setPartnerId] = useState(searchParams.get('partnerId') ?? '');
  const [dueDate, setDueDate] = useState('');
  const [note, setNote] = useState('');
  const [lines, setLines] = useState<HandoverLine[]>([]);
  const [prefillIds] = useState(() => parseItemIds(searchParams.get('items')));
  const isPrefilling = usePrefillLines(prefillIds, setLines);

  const { scanValue, setScanValue, handleScan, isPending: isScanning } = useHandoverScan(lines, setLines);
  const createConsignment = useCreateConsignment();
  const { error, setError, runWithCatch } = useSubmitWithError();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!partnerId) return setError(t('consign.selectPartnerRequired'));
    if (lines.length === 0) return setError(t('consign.atLeastOneItemRequired'));
    if (!lines.every((l) => isStrictlyPositiveMoney(l.minPrice))) {
      return setError(t('consign.priceRequiredAll'));
    }
    await runWithCatch(async () => {
      const res = await createConsignment.mutateAsync({
        partnerId: Number(partnerId),
        items: lines.map((l) => ({ itemId: l.item.id, minPrice: normalizeMoney(l.minPrice) })),
        dueDate: dueDate || undefined,
        note: note.trim() || undefined,
      });
      toast.success(t('consign.createdSuccess'));
      navigate(`/consignments/${res.id}`);
    });
  };

  return {
    partnerId, setPartnerId, dueDate, setDueDate, note, setNote,
    scanValue, setScanValue, lines, setLines, error,
    isPending: createConsignment.isPending || isScanning || isPrefilling,
    handleScan, handleSubmit,
  };
}

function HandoverItemsCard({ form }: { form: ReturnType<typeof useHandoverForm> }) {
  const { t } = useTranslation();
  return (
    <Card className="border-hairline-silver/70 shadow-sm">
      <CardHeader className="py-3 px-4 border-b border-hairline-silver/60">
        <CardTitle className="text-sm font-semibold">{t('consign.itemsToHandover')}</CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        <ScanCodeInput
          id="handover-scan"
          label={t('consign.scanPrompt')}
          value={form.scanValue}
          onChange={form.setScanValue}
          onSubmit={form.handleScan}
          placeholder={t('scan.placeholder')}
          hint={t('consign.scanHint')}
          disabled={form.isPending}
          autoFocus
        />
        <HandoverItemsTable
          lines={form.lines}
          onUpdateMinPrice={(idx, val) =>
            form.setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, minPrice: val } : l)))
          }
          onRemoveLine={(idx) => form.setLines((prev) => prev.filter((_, i) => i !== idx))}
        />
        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={form.isPending || form.lines.length === 0} className="gap-2">
            <span>{form.isPending ? t('common.submitting') : t('consign.submitHandover')}</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/** Main handover workflow page body for dispatching devices on consignment. */
export function HandoverPanel() {
  const { t } = useTranslation();
  const form = useHandoverForm();

  return (
    <form onSubmit={form.handleSubmit} className="space-y-6">
      {form.error && <FormError message={form.error} />}
      <Card className="border-hairline-silver/70 shadow-sm">
        <CardHeader className="py-3 px-4 border-b border-hairline-silver/60">
          <CardTitle className="text-sm font-semibold">{t('consign.handoverDetails')}</CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <HandoverHeaderFields
            partnerId={form.partnerId}
            onPartnerChange={form.setPartnerId}
            dueDate={form.dueDate}
            onDueDateChange={form.setDueDate}
            note={form.note}
            onNoteChange={form.setNote}
          />
        </CardContent>
      </Card>
      <HandoverItemsCard form={form} />
    </form>
  );
}
