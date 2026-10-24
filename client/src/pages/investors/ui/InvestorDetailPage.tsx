import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Pencil, Plus } from 'lucide-react';
import { Badge, Button, Card, TablePagination, BackLink } from '@/shared/ui';
import { formatMoney } from '@/shared/lib';
import {
  useInvestor,
  useInvestorTelegramLink,
  useInvestorTelegramUnlink,
  useInvestorTransactions,
  type Investor,
  type ShareType,
} from '@/entities/investor';
import { InvestorFormDialog, InvestorTransactionDialog } from '@/features/manage-investors';
import { TelegramInviteButton, TelegramLinkStatus } from '@/features/telegram-invite';
import { InvestorTransactionsTable } from './InvestorTransactionsTable';

const TRANSACTIONS_PAGE_SIZE = 20;

/**
 * Telegram link status (with Unlink, even for inactive investors so they can be cleaned up) or the
 * invite button for a real, active investor; the business investor has no chat to link.
 * The page already requires manage_investors, which is also the unlink permission.
 */
function InvestorTelegramInvite({ investor, onRefresh }: { investor: Investor; onRefresh: () => void }) {
  const telegramLink = useInvestorTelegramLink();
  const telegramUnlink = useInvestorTelegramUnlink();
  if (investor.telegramLinked) {
    return (
      <TelegramLinkStatus
        id={investor.id}
        linkedAt={investor.telegramLinkedAt}
        linkedBy={investor.telegramLinkedBy}
        canUnlink
        unlink={telegramUnlink}
        onDone={onRefresh}
      />
    );
  }
  if (investor.isOwn || !investor.isActive) return null;
  return (
    <TelegramInviteButton
      name={investor.name}
      linked={false}
      request={() => telegramLink.mutateAsync(investor.id)}
      onClose={onRefresh}
    />
  );
}

/** Name with business/active badges and the Telegram, edit and add-transaction actions. */
function InvestorDetailHeader({ investor, onEdit, onAddTx, onRefresh }: {
  investor: Investor;
  onEdit: () => void;
  onAddTx: () => void;
  onRefresh: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="space-y-3">
      <BackLink to="/investors" label={t('investors.backToList')} />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl md:text-3xl font-semibold font-sf-pro-display tracking-tight text-ink">
            {investor.name}
          </h1>
          {investor.isOwn && (
            <Badge variant="secondary" className="px-2.5 py-0.5 text-[11px]">
              {t('investors.business')}
            </Badge>
          )}
          <Badge variant={investor.isActive ? 'active' : 'destructive'} className="px-2.5 py-0.5 text-[11px]">
            {investor.isActive ? t('common.active') : t('common.inactive')}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <InvestorTelegramInvite investor={investor} onRefresh={onRefresh} />
          <Button
            variant="outline"
            size="sm"
            onClick={onEdit}
            className="h-8 px-4 rounded-full border-hairline-silver bg-gallery-white text-ink hover:bg-studio-mist hover:border-steel text-xs font-normal gap-1.5"
          >
            <Pencil className="h-3 w-3 text-apple-blue" />
            <span>{t('investors.editInvestor')}</span>
          </Button>
          <Button
            onClick={onAddTx}
            className="gap-2 bg-pricing-blue hover:bg-pricing-blue/90 text-white rounded-full text-xs font-medium px-5 h-8 shadow-none border-0"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{t('investors.addTransaction')}</span>
          </Button>
        </div>
      </div>
      <p className="text-xs text-slate">{t('investors.code')}: {investor.code}</p>
    </div>
  );
}

/** Small labelled stat card. */
function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-5">
      <p className="text-[11px] text-slate tracking-[-0.01em]">{label}</p>
      <p className="mt-1 text-lg font-semibold font-sf-pro-display text-ink tracking-tight">{value}</p>
    </Card>
  );
}

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

/** Transactions with pagination plus the two dialogs. */
function InvestorDetailBody({
  investor,
  txOpen,
  editOpen,
  onTxOpenChange,
  onEditOpenChange,
}: {
  investor: Investor;
  txOpen: boolean;
  editOpen: boolean;
  onTxOpenChange: (open: boolean) => void;
  onEditOpenChange: (open: boolean) => void;
}) {
  const [page, setPage] = useState(1);

  const { data: txPage, isLoading } = useInvestorTransactions(
    investor.id,
    page,
    TRANSACTIONS_PAGE_SIZE,
  );
  const totalPages = Math.ceil((txPage?.total ?? 0) / TRANSACTIONS_PAGE_SIZE) || 1;

  return (
    <>
      <InvestorTransactionsTable transactions={txPage?.items ?? []} isLoading={isLoading} />
      <TablePagination
        page={page}
        totalPages={totalPages}
        total={txPage?.total ?? 0}
        onPageChange={setPage}
      />

      <InvestorFormDialog open={editOpen} onOpenChange={onEditOpenChange} investor={investor} />
      <InvestorTransactionDialog
        open={txOpen}
        onOpenChange={onTxOpenChange}
        investorId={investor.id}
      />
    </>
  );
}

/**
 * Investor detail page: split settings, current balance and the money
 * transactions history (gated by manage_investors).
 */
export function InvestorDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const investorId = Number(id);

  const [txOpen, setTxOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

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

  return (
    <div className="space-y-6">
      <InvestorDetailHeader
        investor={investor}
        onEdit={() => setEditOpen(true)}
        onAddTx={() => setTxOpen(true)}
        onRefresh={() => void refetch()}
      />

      <InvestorCards investor={investor} />
      <InvestorDetailBody
        investor={investor}
        txOpen={txOpen}
        editOpen={editOpen}
        onTxOpenChange={setTxOpen}
        onEditOpenChange={setEditOpen}
      />
    </div>
  );
}
