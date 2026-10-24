import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getApiErrorMessage } from '@/shared/api';
import {
  useHardDeletePreview,
  type HardDeletePreviewRequest,
  type HardDeleteReport,
  type HardDeleteTargetType,
} from '@/entities/super-admin';

/** Holds the hard-delete page state: target picker, preview call and its result/error. */
export function useHardDeleteFlow() {
  const { t } = useTranslation();
  const preview = useHardDeletePreview();
  const [type, setType] = useState<HardDeleteTargetType>('item');
  const [id, setId] = useState('');
  const [report, setReport] = useState<HardDeleteReport | null>(null);
  const [target, setTarget] = useState<HardDeletePreviewRequest | null>(null);
  const [error, setError] = useState<string | null>(null);

  const resetPreview = () => {
    setReport(null);
    setTarget(null);
    setError(null);
  };

  const changeType = (next: HardDeleteTargetType) => { setType(next); resetPreview(); };
  const changeId = (next: string) => { setId(next); resetPreview(); };

  const runPreview = async () => {
    setError(null);
    const request: HardDeletePreviewRequest = { type, id: Number(id) };
    try {
      setReport(await preview.mutateAsync(request));
      setTarget(request);
    } catch (err) {
      resetPreview();
      setError(getApiErrorMessage(err) || t('common.error'));
    }
  };

  const resetAll = () => { resetPreview(); setId(''); };

  return {
    type, id, report, target, error,
    isPending: preview.isPending,
    changeType, changeId, runPreview, resetAll,
  };
}
