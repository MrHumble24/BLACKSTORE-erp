import { formatMoney } from '@/shared/lib';
import type { FeePayer } from '../model/types';

/** Fee for tables: adds the short "inv." mark when the investor bore it, so the owner sees who paid. */
export function formatFee(fee: string, feePaidBy: FeePayer, t: (k: string) => string): string {
  const base = formatMoney(fee);
  return feePaidBy === 'INVESTOR' ? `${base} ${t('suppliers.feePaidByInvestorShort')}` : base;
}
