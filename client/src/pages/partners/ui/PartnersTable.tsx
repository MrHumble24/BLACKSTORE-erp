import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Card,
  CardContent,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/shared/ui';
import { formatMoney } from '@/shared/lib';
import type { PartnerReport } from '@/entities/partner';

interface PartnersTableProps {
  partners: PartnerReport[];
}

interface PartnerRowProps {
  partner: PartnerReport;
}

function PartnerRow({ partner }: PartnerRowProps) {
  const navigate = useNavigate();
  const hasOverdue = partner.overdue > 0;
  const hasDebt = Number(partner.totalOwed) > 0;

  return (
    <TableRow
      onClick={() => navigate(`/partners/${partner.id}`)}
      className="cursor-pointer hover:bg-control-gray/40 transition-colors"
    >
      <TableCell className="font-medium text-xs text-ink">{partner.name}</TableCell>
      <TableCell className="font-mono text-xs text-slate">{partner.phone}</TableCell>
      <TableCell className="text-xs text-slate">{partner.marketLocation || '—'}</TableCell>
      <TableCell className="text-right font-mono text-xs">{partner.held}</TableCell>
      <TableCell className="text-right font-mono text-xs text-slate">
        {partner.soldUnpaid}
      </TableCell>
      <TableCell className="text-right font-mono text-xs font-semibold">
        <span className={hasDebt ? 'text-launch-orange' : ''}>
          {formatMoney(partner.totalOwed)}
        </span>
      </TableCell>
      <TableCell className="text-right font-mono text-xs font-bold">
        <span className={hasOverdue ? 'text-destructive' : 'text-slate'}>
          {partner.overdue}
        </span>
      </TableCell>
    </TableRow>
  );
}

/** Table rendering partners with held items, debts and overdue counts. */
export function PartnersTable({ partners }: PartnersTableProps) {
  const { t } = useTranslation();

  if (partners.length === 0) {
    return (
      <Card className="border-hairline-silver/70 shadow-sm">
        <CardContent className="p-8 text-center text-xs text-slate">
          {t('partners.noPartners')}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-hairline-silver/70 shadow-sm">
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-control-gray/30 text-[11px]">
              <TableHead>{t('partners.name')}</TableHead>
              <TableHead>{t('partners.phone')}</TableHead>
              <TableHead>{t('partners.marketLocation')}</TableHead>
              <TableHead className="text-right">{t('partners.held')}</TableHead>
              <TableHead className="text-right">{t('partners.soldUnpaid')}</TableHead>
              <TableHead className="text-right">{t('partners.totalOwed')}</TableHead>
              <TableHead className="text-right">{t('partners.overdue')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {partners.map((partner) => (
              <PartnerRow key={partner.id} partner={partner} />
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
