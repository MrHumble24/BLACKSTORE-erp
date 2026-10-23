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
  Badge,
} from '@/shared/ui';
import { formatMoney, formatDate } from '@/shared/lib';
import type { ProfitLine } from '@/entities/report';

interface ProfitLinesTableHeaderProps {
  canViewCost: boolean;
}

function ProfitLinesTableHeader({ canViewCost }: ProfitLinesTableHeaderProps) {
  const { t } = useTranslation();
  return (
    <TableHeader>
      <TableRow className="bg-control-gray/30 text-[11px]">
        <TableHead className="whitespace-nowrap">{t('reports.date')}</TableHead>
        <TableHead className="text-center">{t('reports.kind')}</TableHead>
        <TableHead>{t('reports.itemOrModel')}</TableHead>
        <TableHead>{t('reports.investor')}</TableHead>
        <TableHead>{t('reports.location')}</TableHead>
        <TableHead>{t('reports.category')}</TableHead>
        <TableHead className="text-right">{t('reports.salePrice')}</TableHead>
        <TableHead className="text-right">{t('reports.refunded')}</TableHead>
        {canViewCost && <TableHead className="text-right">{t('reports.cost')}</TableHead>}
        <TableHead className="text-right">{t('reports.profit')}</TableHead>
        <TableHead className="text-right">{t('reports.investorShare')}</TableHead>
        <TableHead className="text-right">{t('reports.businessShare')}</TableHead>
      </TableRow>
    </TableHeader>
  );
}

interface ProfitLineRowProps {
  line: ProfitLine;
  canViewCost: boolean;
}

function ProfitLineRow({ line, canViewCost }: ProfitLineRowProps) {
  const { t } = useTranslation();
  const isReturn = line.kind === 'RETURN';
  const itemName = line.item ? `${line.productModel} (${line.item.code})` : line.productModel;

  return (
    <TableRow className="text-xs">
      <TableCell className="text-slate font-mono whitespace-nowrap">
        {formatDate(line.profitDate)}
      </TableCell>
      <TableCell className="text-center">
        <Badge
          variant="outline"
          className={`px-2 py-0.5 text-[10px] rounded-full border-0 font-medium ${
            isReturn ? 'bg-destructive/15 text-destructive' : 'bg-apple-blue/15 text-apple-blue'
          }`}
        >
          {t(`reports.kinds.${line.kind}`)}
        </Badge>
      </TableCell>
      <TableCell className="font-medium text-ink max-w-[180px] truncate" title={itemName}>
        {itemName}
      </TableCell>
      <TableCell className="text-slate truncate max-w-[120px]">
        {line.investor?.name ?? '—'}
      </TableCell>
      <TableCell className="text-slate">{line.location.name}</TableCell>
      <TableCell className="text-slate">{line.category.name}</TableCell>
      <TableCell className="text-right font-mono">{formatMoney(line.salePrice)}</TableCell>
      <TableCell className="text-right font-mono text-slate">{formatMoney(line.refunded)}</TableCell>
      {canViewCost && (
        <TableCell className="text-right font-mono text-slate">{formatMoney(line.cost)}</TableCell>
      )}
      <TableCell
        className={`text-right font-mono font-semibold ${
          isReturn ? 'text-destructive' : 'text-ink'
        }`}
      >
        {formatMoney(line.profit)}
      </TableCell>
      <TableCell className="text-right font-mono text-slate">{formatMoney(line.investorShare)}</TableCell>
      <TableCell className="text-right font-mono text-slate">{formatMoney(line.businessShare)}</TableCell>
    </TableRow>
  );
}

interface ProfitLinesTableProps {
  lines: ProfitLine[];
  canViewCost: boolean;
}

/** Detailed paginated table for profit/loss lines from sales and returns. */
export function ProfitLinesTable({ lines, canViewCost }: ProfitLinesTableProps) {
  const { t } = useTranslation();

  if (lines.length === 0) {
    return (
      <Card className="border-hairline-silver/70 shadow-sm">
        <CardHeader className="py-3 px-4 border-b border-hairline-silver/60">
          <CardTitle className="text-sm font-semibold">{t('reports.detailedLines')}</CardTitle>
        </CardHeader>
        <CardContent className="p-8 text-center text-xs text-slate">
          {t('reports.noLines')}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-hairline-silver/70 shadow-sm">
      <CardHeader className="py-3 px-4 border-b border-hairline-silver/60">
        <CardTitle className="text-sm font-semibold">{t('reports.detailedLines')}</CardTitle>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        <Table>
          <ProfitLinesTableHeader canViewCost={canViewCost} />
          <TableBody>
            {lines.map((line, idx) => (
              <ProfitLineRow
                key={`${line.saleId}-${line.saleItemId}-${line.returnId ?? idx}`}
                line={line}
                canViewCost={canViewCost}
              />
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
