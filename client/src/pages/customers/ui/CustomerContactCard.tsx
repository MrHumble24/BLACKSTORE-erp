import { useTranslation } from 'react-i18next';
import { Edit2 } from 'lucide-react';
import { Button, Card, CardHeader, CardTitle, CardContent } from '@/shared/ui';
import { formatDate } from '@/shared/lib';
import type { CustomerDetail } from '@/entities/customer';
import { CustomerTelegramRow } from './CustomerTelegramRow';

interface CustomerContactCardProps {
  customer: CustomerDetail;
  onEdit: () => void;
  /** Re-reads the customer after the invite dialog closes or an unlink succeeds. */
  onRefresh: () => void;
}

/** Card showing customer phone, notes, registration date, Telegram link status and edit trigger. */
export function CustomerContactCard({ customer, onEdit, onRefresh }: CustomerContactCardProps) {
  const { t } = useTranslation();

  return (
    <Card className="border-hairline-silver/70 shadow-sm md:col-span-2">
      <CardHeader className="py-3 px-4 border-b border-hairline-silver/60 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-semibold">{t('customers.title')}</CardTitle>
        <Button variant="ghost" size="sm" onClick={onEdit} className="h-7 text-xs gap-1">
          <Edit2 className="h-3 w-3" />
          {t('common.edit')}
        </Button>
      </CardHeader>
      <CardContent className="p-4 space-y-2 text-xs">
        <div className="flex justify-between">
          <span className="text-slate">{t('customers.phone')}:</span>
          <span className="font-mono text-ink font-medium">{customer.phone}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate">{t('customers.note')}:</span>
          <span className="text-ink">{customer.note || '—'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate">{t('customers.createdAt')}:</span>
          <span className="text-slate">{formatDate(customer.createdAt)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate">{t('customers.telegram')}:</span>
          <CustomerTelegramRow customer={customer} onRefresh={onRefresh} />
        </div>
      </CardContent>
    </Card>
  );
}
