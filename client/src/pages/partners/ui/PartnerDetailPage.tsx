import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Send } from 'lucide-react';
import { BackLink, Button } from '@/shared/ui';
import { usePartner, type PartnerReport } from '@/entities/partner';
import { useConsignments } from '@/entities/consignment';
import { useSales, type SaleSummary } from '@/entities/sale';
import { PartnerFormDialog } from '@/features/manage-partners';
import { PaymentDialog } from '@/features/record-payment';
import { PartnerContactCard } from './PartnerContactCard';
import { PartnerCards } from './PartnerCards';
import { PartnerConsignmentsTable } from './PartnerConsignmentsTable';
import { PartnerDebtSalesTable } from './PartnerDebtSalesTable';

interface PartnerDetailHeaderProps {
  partner: PartnerReport;
  onHandover: () => void;
}

function PartnerDetailHeader({ partner, onHandover }: PartnerDetailHeaderProps) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-hairline-silver/70 pb-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-ink">{partner.name}</h1>
        {partner.phone && <p className="text-xs text-slate font-mono mt-0.5">{partner.phone}</p>}
      </div>
      <Button onClick={onHandover} className="gap-1.5 h-8 text-xs">
        <Send className="h-3.5 w-3.5" />
        <span>{t('consign.handOverItems')}</span>
      </Button>
    </div>
  );
}

/** Partner details page with contact card, KPI metrics, consignments history and debts. */
export function PartnerDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const partnerId = Number(id);

  const [editOpen, setEditOpen] = useState(false);
  const [paymentSale, setPaymentSale] = useState<SaleSummary | null>(null);

  const { data: partner, isLoading } = usePartner(partnerId);
  // ponytail: first 50 consignments and 50 debt sales; add pagination when a partner exceeds that.
  const { data: consignmentsPage } = useConsignments({ partnerId }, 1, 50);
  const { data: debtSalesPage } = useSales({ partnerId, status: 'DEBT' }, 1, 50);

  if (isLoading || !partner) {
    return (
      <div className="p-12 text-center text-xs text-slate">
        {t(isLoading ? 'common.loading' : 'partners.notFound')}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <BackLink to="/partners" label={t('partners.backToList')} />
      <PartnerDetailHeader
        partner={partner}
        onHandover={() => navigate(`/consignments/new?partnerId=${partner.id}`)}
      />
      <PartnerCards partner={partner} />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <PartnerContactCard partner={partner} onEdit={() => setEditOpen(true)} />
        </div>
        <div className="md:col-span-2 space-y-6">
          <PartnerConsignmentsTable consignments={consignmentsPage?.items ?? []} />
          <PartnerDebtSalesTable sales={debtSalesPage?.items ?? []} onPay={setPaymentSale} />
        </div>
      </div>
      <PartnerFormDialog open={editOpen} onOpenChange={setEditOpen} partner={partner} />
      {paymentSale && (
        <PaymentDialog
          open={Boolean(paymentSale)}
          onOpenChange={(open) => !open && setPaymentSale(null)}
          saleId={paymentSale.id}
          balance={paymentSale.balance}
        />
      )}
    </div>
  );
}
