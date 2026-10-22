import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
  Badge, TableLoadingRow, TableEmptyRow,
} from '@/shared/ui';
import { InvestorActiveToggle, type Investor } from '@/entities/investor';

interface InvestorsTableProps {
  investors: Investor[];
  isLoading: boolean;
}

/** Single row; the name links to the investor detail page. */
function InvestorRow({ investor }: { investor: Investor }) {
  const { t } = useTranslation();

  return (
    <TableRow className="border-b border-hairline-silver/40 hover:bg-studio-mist/60">
      <TableCell>
        <Link
          to={`/investors/${investor.id}`}
          className="font-medium text-apple-blue underline-offset-4 hover:underline"
        >
          {investor.name}
        </Link>
        {investor.isOwn && (
          <span className="ml-2 text-[11px] text-slate tracking-[-0.01em]">
            {t('investors.business')}
          </span>
        )}
      </TableCell>
      <TableCell className="text-xs text-slate">{investor.code}</TableCell>
      <TableCell>
        <Badge variant={investor.isActive ? 'active' : 'destructive'} className="px-2.5 py-0.5 text-[11px]">
          {investor.isActive ? t('common.active') : t('common.inactive')}
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        {/* The OWN investor is the shop itself; deactivate is hidden rather than erroring. */}
        {investor.isOwn ? null : <InvestorActiveToggle investor={investor} />}
      </TableCell>
    </TableRow>
  );
}

/** Apple-styled investors table with hairline borders. */
export function InvestorsTable({ investors, isLoading }: InvestorsTableProps) {
  const { t } = useTranslation();

  return (
    <div className="rounded-[28px] border border-hairline-silver/70 bg-gallery-white overflow-hidden shadow-none p-1">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-hairline-silver/60 hover:bg-transparent">
            <TableHead>{t('investors.name')}</TableHead>
            <TableHead>{t('investors.code')}</TableHead>
            <TableHead>{t('investors.status')}</TableHead>
            <TableHead className="text-right">{t('common.actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableLoadingRow colSpan={4} />}
          {!isLoading && investors.length === 0 && (
            <TableEmptyRow colSpan={4} message={t('investors.noInvestors')} />
          )}
          {!isLoading && investors.map((investor) => (
            <InvestorRow key={investor.id} investor={investor} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
