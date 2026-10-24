import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useInvestorAccount, type Investor } from '@/entities/investor';
import { SupplierPaymentDialog } from '@/features/manage-suppliers';
import { InvestorOwedCard } from './InvestorOwedCard';
import { InvestorStatement } from './InvestorStatement';
import { InvestorTransactionsSection } from './InvestorTransactionsTable';

const STATEMENT_PAGE_SIZE = 20;

interface InvestorAccountProps {
  /** A linked investor: `supplier` is set. */
  investor: Investor;
  sendOpen: boolean;
  onSendOpenChange: (open: boolean) => void;
}

/**
 * Account body for a linked investor (F26): the one number, the statement, the cash table folded
 * under it (FR-10) and the "Send money" dialog (a payment to the linked supplier).
 */
export function InvestorAccount({ investor, sendOpen, onSendOpenChange }: InvestorAccountProps) {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const { data, isLoading } = useInvestorAccount(investor.id, page, STATEMENT_PAGE_SIZE);
  // The page renders this only for a linked investor; the guard narrows the type for the dialog.
  if (!investor.supplier) return null;

  return (
    <>
      <InvestorOwedCard name={investor.name} owed={data?.owedToInvestor} />
      <InvestorStatement
        lines={data?.lines ?? []}
        total={data?.total ?? 0}
        page={page}
        pageSize={STATEMENT_PAGE_SIZE}
        isLoading={isLoading}
        onPageChange={setPage}
      />
      <details className="space-y-3">
        <summary className="cursor-pointer text-sm font-semibold text-ink tracking-tight">
          {t('investors.account.cashTable')}
        </summary>
        <InvestorTransactionsSection investorId={investor.id} />
      </details>
      <SupplierPaymentDialog
        open={sendOpen}
        onOpenChange={onSendOpenChange}
        supplierId={investor.supplier.id}
        linkedInvestorName={investor.name}
      />
    </>
  );
}
