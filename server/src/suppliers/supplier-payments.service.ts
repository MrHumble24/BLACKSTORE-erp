import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, SupplierPayment } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { parsePastDate } from '../common/dates';
import { PaginationQueryDto } from '../common/pagination-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

/** Payments made to a supplier (PRD FR-17). Append-only: a wrong amount is fixed by a correcting entry. */
@Injectable()
export class SupplierPaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** One page of payments, newest first; 404 if the supplier is missing. */
  async findAll(supplierId: number, { page, pageSize }: PaginationQueryDto) {
    await this.assertSupplierExists(supplierId);
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.supplierPayment.findMany({
        where: { supplierId },
        orderBy: [{ date: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.supplierPayment.count({ where: { supplierId } }),
    ]);
    return { items: rows.map(toResponse), total, page, pageSize };
  }

  /** Records a payment; amount may be negative (correcting entry) but never 0. */
  async create(supplierId: number, dto: CreatePaymentDto, actorId: number) {
    await this.assertSupplierExists(supplierId);
    const amount = new Prisma.Decimal(dto.amount);
    if (amount.isZero()) throw new BadRequestException('amount must not be 0');

    const created = await this.prisma.$transaction(async (tx) => {
      const payment = await tx.supplierPayment.create({
        data: {
          supplierId,
          amount,
          fee: dto.fee ? new Prisma.Decimal(dto.fee) : undefined,
          date: parsePastDate(dto.date),
          note: dto.note,
        },
      });
      await this.audit.log(
        { userId: actorId, action: 'create', entity: 'SupplierPayment', entityId: payment.id, after: payment },
        tx,
      );
      return payment;
    });
    return toResponse(created);
  }

  private async assertSupplierExists(supplierId: number) {
    const exists = await this.prisma.supplier.count({ where: { id: supplierId } });
    if (!exists) throw new NotFoundException('Supplier not found');
  }
}

/** Money as decimal strings, date as an ISO string. */
function toResponse(p: SupplierPayment) {
  return {
    id: p.id,
    amount: p.amount.toFixed(2),
    fee: p.fee.toFixed(2),
    date: p.date.toISOString(),
    note: p.note,
  };
}
