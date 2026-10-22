import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InvestorTransaction, Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationQueryDto } from '../common/pagination-query.dto';
import { CreateTransactionDto } from './dto/create-transaction.dto';

/** Investor money in (DEPOSIT) and out (PAYOUT). Append-only: a wrong amount is fixed by a correcting entry. */
@Injectable()
export class InvestorTransactionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** One page of transactions, newest first; 404 if the investor is missing. */
  async findAll(investorId: number, { page, pageSize }: PaginationQueryDto) {
    await this.assertInvestorExists(investorId);
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.investorTransaction.findMany({
        where: { investorId },
        orderBy: [{ date: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.investorTransaction.count({ where: { investorId } }),
    ]);
    return { items: rows.map(toResponse), total, page, pageSize };
  }

  /** Records a transaction with amount > 0; 404 if the investor is missing. */
  async create(investorId: number, dto: CreateTransactionDto, actorId: number) {
    await this.assertInvestorExists(investorId);
    const amount = new Prisma.Decimal(dto.amount);
    if (amount.lte(0)) throw new BadRequestException('amount must be greater than 0');

    const created = await this.prisma.$transaction(async (tx) => {
      const transaction = await tx.investorTransaction.create({
        data: {
          investorId,
          type: dto.type,
          amount,
          date: dto.date ? new Date(dto.date) : undefined,
          note: dto.note,
        },
      });
      await this.audit.log(
        { userId: actorId, action: 'create', entity: 'InvestorTransaction', entityId: transaction.id, after: transaction },
        tx,
      );
      return transaction;
    });
    return toResponse(created);
  }

  private async assertInvestorExists(investorId: number) {
    const exists = await this.prisma.investor.count({ where: { id: investorId } });
    if (!exists) throw new NotFoundException('Investor not found');
  }
}

/** Money as a decimal string, date as an ISO string. */
function toResponse(t: InvestorTransaction) {
  return {
    id: t.id,
    type: t.type,
    amount: t.amount.toFixed(2),
    date: t.date.toISOString(),
    note: t.note,
  };
}
