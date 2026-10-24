import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BackLink } from '@/shared/ui';
import { formatMoney } from '@/shared/lib';
import { useAuthStore } from '@/entities/session';
import { useInvestor, type Investor, type ShareType } from '@/entities/investor';
import { InvestorFormDialog, InvestorTransactionDialog } from '@/features/manage-investors';
import { InvestorDetailHeader } from './InvestorDetailHeader';
import { InvestorTransactionsSection } from './InvestorTransactionsTable';
import { InvestorMoneyCards } from './InvestorMoneyCards';
import { InvestorSupplierPaymentsTable } from './InvestorSupplierPaymentsTable';
import { InvestorAccount } from './InvestorAccount';
import { InfoCard } from './InfoCard';

/** Translated share-type label for the read-only settings card. */
function shareTypeLabel(shareType: ShareType | undefined, t: (k: string) => string): string {
  if (shareType === 'PERCENT') return t('investors.sharePercent');
  if (shareType === 'FIXED_PER_ITEM') return t('investors.shareFixed');
  return t('investors.shareNone');
}

/** Share value display: percents get a '%' suffix, fixed sums are plain money. */
function shareValueDisplay(investor: Investor, t: (k: string) => string): string {
  if (!investor.shareType || investor.shareType === 'NONE' || investor.shareValue == null) {
    return t('investors.shareNone');
  }
  return investor.shareType === 'PERCENT'
    ? `${formatMoney(investor.shareValue)} %`
    : formatMoney(investor.shareValue);
}

/** Split settings as read-only stat cards. */
function InvestorCards({ investor }: { investor: Investor }) {
  const { t } = useTranslation();

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <InfoCard
        label={t('investors.shareType')}
        value={shareTypeLabel(investor.shareType, t)}
      />
      <InfoCard label={t('investors.shareValue')} value={shareValueDisplay(investor, t)} />
      <InfoCard label={t('investors.balance')} value={formatMoney(investor.balance ?? null)} />
    </div>
  );
}

/** Unlinked investor: split cards, F25 money cards, transactions and "Sent to suppliers". */
function PlainInvestorBody({ investor }: { investor: Investor }) {
  return (
    <>
      <InvestorCards investor={investor} />
      {investor.money && <InvestorMoneyCards money={investor.money} />}
      <InvestorTransactionsSection investorId={investor.id} />
      <InvestorSupplierPaymentsTable investorId={investor.id} />
    </>
  );
}

/**
 * Investor detail page (manage_investors). A linked investor (F26) gets the account view: one
 * number, "Send money" and the statement; an unlinked one keeps the split cards and tables.
 * The account needs view_cost (the server returns 403 without it), so other roles get the plain body.
 */
export function InvestorDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const investorId = Number(id);

  const [txOpen, setTxOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const canViewCost = useAuthStore((state) => state.hasPermission('view_cost'));

  const { data: investor, isLoading, refetch } = useInvestor(
    Number.isNaN(investorId) ? undefined : investorId,
  );

  if (isLoading) {
    return <div className="text-xs text-slate">{t('common.loading')}</div>;
  }

  if (!investor) {
    return (
      <div className="space-y-4">
        <BackLink to="/investors" label={t('investors.backToList')} />
        <div className="text-xs text-slate">{t('investors.notFound')}</div>
      </div>
    );
  }

  const showAccount = Boolean(investor.supplier) && canViewCost;

  return (
    <div className="space-y-6">
      <InvestorDetailHeader
        investor={investor}
        onEdit={() => setEditOpen(true)}
        onAddTx={() => setTxOpen(true)}
        onSendMoney={showAccount ? () => setSendOpen(true) : undefined}
        onRefresh={() => void refetch()}
      />
      {showAccount ? (
        <InvestorAccount investor={investor} sendOpen={sendOpen} onSendOpenChange={setSendOpen} />
      ) : (
        <PlainInvestorBody investor={investor} />
      )}
      <InvestorFormDialog open={editOpen} onOpenChange={setEditOpen} investor={investor} />
      <InvestorTransactionDialog open={txOpen} onOpenChange={setTxOpen} investorId={investor.id} />
    </div>
  );
}
