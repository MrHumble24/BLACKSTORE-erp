import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { FeePayer, Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { parsePastDate } from '../common/dates';
import { PaginationQueryDto } from '../common/pagination-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

const investorInclude = { investor: { select: { id: true, name: true } } } satisfies Prisma.SupplierPaymentInclude;
const supplierInclude = { supplier: { select: { id: true, name: true } } } satisfies Prisma.SupplierPaymentInclude;

type PaymentWithInvestor = Prisma.SupplierPaymentGetPayload<{ include: typeof investorInclude }>;
type PaymentWithSupplier = Prisma.SupplierPaymentGetPayload<{ include: typeof supplierInclude }>;

const newestFirst: Prisma.SupplierPaymentOrderByWithRelationInput[] = [{ date: 'desc' }, { id: 'desc' }];

/** Payments made to a supplier (PRD FR-17). Append-only: a wrong amount is fixed by a correcting entry. */
@Injectable()
export class SupplierPaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** One page of payments, newest first, with whose money it was; 404 if the supplier is missing. */
  async findAll(supplierId: number, { page, pageSize }: PaginationQueryDto) {
    await this.assertSupplierExists(supplierId);
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.supplierPayment.findMany({
        where: { supplierId },
        include: investorInclude,
        orderBy: newestFirst,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.supplierPayment.count({ where: { supplierId } }),
    ]);
    return { items: rows.map(toResponse), total, page, pageSize };
  }

  /** One page of payments made with an investor's money (F25), newest first; 404 if the investor is missing. */
  async findAllForInvestor(investorId: number, { page, pageSize }: PaginationQueryDto) {
    const exists = await this.prisma.investor.count({ where: { id: investorId } });
    if (!exists) throw new NotFoundException('Investor not found');
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.supplierPayment.findMany({
        where: { investorId },
        include: supplierInclude,
        orderBy: newestFirst,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.supplierPayment.count({ where: { investorId } }),
    ]);
    return { items: rows.map(toInvestorRow), total, page, pageSize };
  }

  /** Records a payment; amount may be negative (correcting entry) but never 0. */
  async create(supplierId: number, dto: CreatePaymentDto, actorId: number) {
    const { amount, fee } = parseAmounts(dto);
    const feePaidBy = dto.feePaidBy ?? FeePayer.BUSINESS;
    if (feePaidBy === FeePayer.INVESTOR && dto.investorId === undefined) {
      throw new BadRequestException('feePaidBy INVESTOR needs an investorId');
    }
    await this.assertSupplierExists(supplierId);
    if (dto.investorId !== undefined) await this.assertInvestorUsable(dto.investorId);

    const created = await this.prisma.$transaction(async (tx) => {
      const payment = await tx.supplierPayment.create({
        data: {
          supplierId,
          amount,
          fee,
          date: parsePastDate(dto.date),
          note: dto.note,
          investorId: dto.investorId,
          feePaidBy,
        },
        include: investorInclude,
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

  /** The money must belong to a real, active investor; the business's own money carries no investor. */
  private async assertInvestorUsable(investorId: number) {
    const investor = await this.prisma.investor.findUnique({
      where: { id: investorId },
      select: { isOwn: true, isActive: true },
    });
    if (!investor) throw new NotFoundException('Investor not found');
    if (investor.isOwn === true) throw new BadRequestException("Use no investor for the business's own money");
    if (!investor.isActive) throw new BadRequestException('Inactive investor');
  }
}

/** amount ≠ 0; a negative fee only on a correcting (negative) entry, so a wrong fee can be reversed. */
function parseAmounts(dto: CreatePaymentDto) {
  const amount = new Prisma.Decimal(dto.amount);
  if (amount.isZero()) throw new BadRequestException('amount must not be 0');
  const fee = dto.fee ? new Prisma.Decimal(dto.fee) : undefined;
  if (fee?.isNegative() && !amount.isNegative()) {
    throw new BadRequestException('A negative fee is only allowed on a correcting entry');
  }
  // Bound the reversal so the investor's feesCharged can't be pushed below zero.
  if (fee?.isNegative() && fee.abs().gt(amount.abs())) {
    throw new BadRequestException('A fee correction cannot exceed the corrected amount');
  }
  return { amount, fee };
}

/** Fields shared by both row shapes: money as decimal strings, date as an ISO string. */
function baseRow(p: PaymentWithInvestor | PaymentWithSupplier) {
  return {
    id: p.id,
    amount: p.amount.toFixed(2),
    fee: p.fee.toFixed(2),
    feePaidBy: p.feePaidBy,
    date: p.date.toISOString(),
    note: p.note,
  };
}

/** Row of a supplier's payment list, with whose money it was. */
function toResponse(p: PaymentWithInvestor) {
  return { ...baseRow(p), investor: p.investor };
}

/** Row of an investor's "sent to suppliers" list. */
function toInvestorRow(p: PaymentWithSupplier) {
  return { ...baseRow(p), supplier: p.supplier };
}
