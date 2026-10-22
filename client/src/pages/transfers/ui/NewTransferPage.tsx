import { useTranslation } from 'react-i18next';
import { BackLink } from '@/shared/ui';
import { TransferPanel } from '@/features/transfer-stock';

/** Hosts the transfer builder at /transfers/new (transfer_stock). */
export function NewTransferPage() {
  const { t } = useTranslation();

  return (
    <div className="space-y-5">
      <BackLink to="/transfers" label={t('transfers.backToList')} />
      <h1 className="text-2xl md:text-3xl font-semibold font-sf-pro-display tracking-tight text-ink">
        {t('transfers.newTransfer')}
      </h1>
      <TransferPanel />
    </div>
  );
}
