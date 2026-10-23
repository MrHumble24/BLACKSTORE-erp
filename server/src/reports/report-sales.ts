import { Prisma, SaleStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { buildLinesForSale, ProfitLine, reportSaleSelect } from './profit-lines';

/** An inclusive date period; an absent bound is open. */
export type Period = { gte?: Date; lte?: Date } | undefined;

/**
 * Loads the report lines whose profitDate falls in the period, shared by the profit and investor
 * reports. The SQL prefilter keeps only PAID/RETURNED sales that can have a line in the period
 * (created by its end, and created, paid or returned since its start); the exact profitDate
 * check then runs on the built lines. `extraWhere` adds sale-level filters (location, investor ...).
 */
export async function loadReportLines(
  prisma: PrismaService,
  period: Period,
  extraWhere: Prisma.SaleWhereInput = {},
): Promise<ProfitLine[]> {
  const gte = period?.gte;
  const lte = period?.lte;
  const sales = await prisma.sale.findMany({
    where: {
      ...extraWhere,
      status: { in: [SaleStatus.PAID, SaleStatus.RETURNED] },
      createdAt: lte ? { lte } : undefined,
      OR: gte
        ? [
            { createdAt: { gte } },
            { payments: { some: { date: { gte } } } },
            { returns: { some: { date: { gte } } } },
          ]
        : undefined,
    },
    select: reportSaleSelect,
  });
  return sales
    .flatMap(buildLinesForSale)
    .filter((l) => (!gte || l.profitDate >= gte) && (!lte || l.profitDate <= lte));
}
