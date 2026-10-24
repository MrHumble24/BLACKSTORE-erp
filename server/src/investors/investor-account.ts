import { PaginationQueryDto } from '../common/pagination-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import { loadReportLines } from '../reports/report-sales';
import { buildAccount, cashLines, goodsLines, paymentLines, shareLines } from './investor-account-lines';

/**
 * The account between the shop and an investor linked to supplier S (F26):
 * goods received from S − money sent to S − fees the investor bears + their profit share
 * + cash they handed in − cash paid out to them. A plain function taking prisma (like
 * loadReportLines), so no new provider and no module cycle.
 */
export async function loadInvestorAccount(
  prisma: PrismaService,
  investor: { id: number; supplier: { id: number; name: string } },
  { page, pageSize }: PaginationQueryDto,
) {
  const { id, supplier } = investor;
  // ponytail: whole history loaded per request (hundreds of lines a year per investor, not millions);
  // add a materialised ledger when a page takes > 200 ms.
  const [batches, payments, profitLines, transactions] = await Promise.all([
    prisma.batch.findMany({
      where: { supplierId: supplier.id },
      select: { id: true, arrivalDate: true, lines: { select: { unitPrice: true, quantity: true } } },
    }),
    prisma.supplierPayment.findMany({
      where: { supplierId: supplier.id },
      select: { id: true, date: true, amount: true, fee: true, feePaidBy: true, investorId: true },
    }),
    // The owner copied onto the sale line (BR-7), not item.investorId, which a buy-back overwrites.
    loadReportLines(prisma, undefined, { items: { some: { investorId: id } } }),
    prisma.investorTransaction.findMany({
      where: { investorId: id },
      select: { id: true, date: true, type: true, amount: true },
    }),
  ]);
  return buildAccount(
    [
      ...goodsLines(batches),
      ...paymentLines(supplier, payments, id),
      ...shareLines(profitLines, id),
      ...cashLines(transactions),
    ],
    page,
    pageSize,
  );
}
