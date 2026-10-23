import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/shared/ui';
import { formatDate } from '@/shared/lib';
import { isConsignmentOverdue, type ConsignmentSummary } from '@/entities/consignment';

interface PartnerConsignmentsTableProps {
  consignments: ConsignmentSummary[];
}

interface ConsignmentRowProps {
  consignment: ConsignmentSummary;
}

function ConsignmentRow({ consignment }: ConsignmentRowProps) {
  const navigate = useNavigate();
  const isOverdue = isConsignmentOverdue(consignment);

  return (
    <TableRow
      onClick={() => navigate(`/consignments/${consignment.id}`)}
      className="cursor-pointer hover:bg-control-gray/40 transition-colors"
    >
      <TableCell className="font-mono text-xs text-ink">#{consignment.id}</TableCell>
      <TableCell className="text-xs text-slate">{formatDate(consignment.date)}</TableCell>
      <TableCell className="text-xs">
        <span className={isOverdue ? 'text-destructive font-semibold' : 'text-slate'}>
          {formatDate(consignment.dueDate)}
        </span>
      </TableCell>
      <TableCell className="text-right font-mono text-xs">{consignment.itemCount}</TableCell>
      <TableCell className="text-right font-mono text-xs font-semibold">
        {consignment.heldCount}
      </TableCell>
      <TableCell className="text-xs text-slate">{consignment.handedBy.name}</TableCell>
    </TableRow>
  );
}

/** Consignments history table for a specific partner. */
export function PartnerConsignmentsTable({
  consignments,
}: PartnerConsignmentsTableProps) {
  const { t } = useTranslation();

  if (consignments.length === 0) {
    return (
      <Card className="border-hairline-silver/70 shadow-sm">
        <CardHeader className="py-3 px-4 border-b border-hairline-silver/60">
          <CardTitle className="text-sm font-semibold">{t('consign.consignments')}</CardTitle>
        </CardHeader>
        <CardContent className="p-6 text-center text-xs text-slate">
          {t('consign.noConsignments')}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-hairline-silver/70 shadow-sm">
      <CardHeader className="py-3 px-4 border-b border-hairline-silver/60">
        <CardTitle className="text-sm font-semibold">{t('consign.consignments')}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-control-gray/30 text-[11px]">
              <TableHead className="w-16">#</TableHead>
              <TableHead>{t('consign.date')}</TableHead>
              <TableHead>{t('consign.dueDate')}</TableHead>
              <TableHead className="text-right">{t('consign.itemCount')}</TableHead>
              <TableHead className="text-right">{t('consign.heldCount')}</TableHead>
              <TableHead>{t('consign.handedBy')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {consignments.map((c) => (
              <ConsignmentRow key={c.id} consignment={c} />
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
