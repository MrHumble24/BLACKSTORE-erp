import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useHardDeleteFlow } from '../model/useHardDeleteFlow';
import { HardDeletePickerCard } from './HardDeletePickerCard';
import { ConfirmDeleteDialog } from './ConfirmDeleteDialog';

/** Super-admin danger zone: preview a hard delete's blast radius, then confirm + execute. */
export function HardDeletePage() {
  const { t } = useTranslation();
  const flow = useHardDeleteFlow();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleDeleted = () => {
    setConfirmOpen(false);
    flow.resetAll();
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-semibold font-sf-pro-display tracking-tight text-ink">
          {t('hardDelete.title')}
        </h1>
        <p className="text-xs text-slate">{t('hardDelete.subtitle')}</p>
      </div>

      <HardDeletePickerCard flow={flow} onContinue={() => setConfirmOpen(true)} />

      {flow.target && (
        <ConfirmDeleteDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          target={flow.target}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  );
}
