import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { TableCell, TableRow } from '@/shared/ui';
import { cn, formatDate, formatMoney } from '@/shared/lib';
import type { AccountLine, AccountLineKind } from '@/entities/investor';

/** Sentence key per line kind (params come from the line). */
const LINE_KEY: Record<AccountLineKind, string> = {
  GOODS: 'investors.account.line.goods',
  SENT: 'investors.account.line.sent',
  FEE: 'investors.account.line.fee',
  SHARE: 'investors.account.line.share',
  RETURN: 'investors.account.line.return',
  CASH_IN: 'investors.account.line.cashIn',
  CASH_OUT: 'investors.account.line.cashOut',
};

/** Route for the line's source record; transactions have no page of their own. */
const REF_PATH = { batch: '/batches', sale: '/sales', supplier: '/suppliers' } as const;

/** Plain-words sentence, linked to the batch / sale / supplier it came from. */
function LineSentence({ line, text }: { line: AccountLine; text: string }) {
  if (!line.ref || line.ref.kind === 'transaction') return <span className="text-ink">{text}</span>;
  return (
    <Link to={`${REF_PATH[line.ref.kind]}/${line.ref.id}`} className="text-ink hover:underline">
      {text}
    </Link>
  );
}

/** One statement row: date, sentence and the signed amount with an "owes more / less" hint. */
export function StatementRow({ line }: { line: AccountLine }) {
  const { t } = useTranslation();
  const value = Number(line.amount);
  const takesAway = value < 0;
  const amount = formatMoney(Math.abs(value));

  return (
    <TableRow className="border-b border-hairline-silver/40 hover:bg-studio-mist/60">
      <TableCell className="text-xs text-slate">{formatDate(line.date)}</TableCell>
      <TableCell className="text-xs">
        <LineSentence line={line} text={t(LINE_KEY[line.kind], { ...line.params, amount })} />
      </TableCell>
      <TableCell className="text-right">
        <p className={cn('text-xs font-medium font-sf-pro-display', takesAway ? 'text-launch-orange' : 'text-ink')}>
          {takesAway ? '−' : '+'} {amount}
        </p>
        <p className="text-[10px] text-slate">
          {t(takesAway ? 'investors.account.owesLess' : 'investors.account.owesMore')}
        </p>
      </TableCell>
    </TableRow>
  );
}
