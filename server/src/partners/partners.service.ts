import { Injectable, NotFoundException } from '@nestjs/common';
import { ConsignmentItemStatus, Partner, Prisma, SaleStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { startOfToday } from '../common/dates';
import { balanceOf, sumPaid, sumRefunded } from '../sales/sale-totals';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePartnerDto } from './dto/create-partner.dto';
import { QueryPartnersDto } from './dto/query-partners.dto';
import { UpdatePartnerDto } from './dto/update-partner.dto';

/** The computed, never-stored numbers on a PartnerReport (BR-8). */
interface ReportNumbers {
  held: number;
  soldUnpaid: number;
  totalOwed: Prisma.Decimal;
  overdue: number;
}

/** Report numbers of a partner with no records. */
function zero(): ReportNumbers {
  return { held: 0, soldUnpaid: 0, totalOwed: new Prisma.Decimal(0), overdue: 0 };
}

/** Partner shops and their live consignment/debt figures (FR-26, W4). */
@Injectable()
export class PartnersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** Paginated, newest-first list; `search` matches name or phone. Report numbers are computed, not stored. */
  async findAll(query: QueryPartnersDto) {
    const where: Prisma.PartnerWhereInput = query.search
      ? {
          OR: [
            { name: { contains: query.search.trim(), mode: 'insensitive' } },
            { phone: { contains: query.search.trim(), mode: 'insensitive' } },
          ],
        }
      : {};
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.partner.findMany({
        where,
        orderBy: { id: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.partner.count({ where }),
    ]);
    const numbers = await this.computeReports(rows.map((p) => p.id));
    return {
      items: rows.map((p) => toPartnerReport(p, numbers.get(p.id))),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  /** One partner with its report numbers; 404 if missing. */
  async findOne(id: number) {
    const partner = await this.prisma.partner.findUnique({ where: { id } });
    if (!partner) throw new NotFoundException('Partner not found');
    const numbers = await this.computeReports([id]);
    return toPartnerReport(partner, numbers.get(id));
  }

  /** Creates a partner. */
  async create(dto: CreatePartnerDto, actorId: number) {
    const created = await this.prisma.$transaction(async (tx) => {
      const partner = await tx.partner.create({
        data: {
          name: dto.name.trim(),
          phone: dto.phone.trim(),
          marketLocation: dto.marketLocation?.trim() ?? null,
          note: dto.note ?? null,
        },
      });
      await this.audit.log(
        { userId: actorId, action: 'create', entity: 'Partner', entityId: partner.id, after: partner },
        tx,
      );
      return partner;
    });
    return toPartner(created);
  }

  /** Edits a partner; 404 if missing. */
  async update(id: number, dto: UpdatePartnerDto, actorId: number) {
    const updated = await this.prisma.$transaction(async (tx) => {
      const before = await tx.partner.findUnique({ where: { id } });
      if (!before) throw new NotFoundException('Partner not found');
      const partner = await tx.partner.update({
        where: { id },
        data: {
          name: dto.name?.trim(),
          phone: dto.phone?.trim(),
          marketLocation: dto.marketLocation === null ? null : dto.marketLocation?.trim(),
          note: dto.note,
        },
      });
      await this.audit.log(
        { userId: actorId, action: 'update', entity: 'Partner', entityId: id, before, after: partner },
        tx,
      );
      return partner;
    });
    return toPartner(updated);
  }

  /**
   * Report numbers for the given partners in two queries (held items + their overdue flag;
   * unpaid partner sales for soldUnpaid and totalOwed). Returns a map keyed by partner id.
   */
  private async computeReports(ids: number[]): Promise<Map<number, ReportNumbers>> {
    const map = new Map<number, ReportNumbers>(ids.map((id) => [id, zero()]));
    if (ids.length === 0) return map;
    const [held, debtSales] = await Promise.all([
      this.prisma.consignmentItem.findMany({
        where: { status: ConsignmentItemStatus.AT_PARTNER, consignment: { partnerId: { in: ids } } },
        select: { consignment: { select: { partnerId: true, dueDate: true } } },
      }),
      this.prisma.sale.findMany({
        where: { partnerId: { in: ids }, status: SaleStatus.DEBT },
        select: {
          partnerId: true,
          total: true,
          payments: { select: { amount: true } },
          returns: { select: { refundAmount: true } },
        },
      }),
    ]);
    const today = startOfToday();
    for (const row of held) {
      const r = map.get(row.consignment.partnerId);
      if (!r) continue;
      r.held += 1;
      if (row.consignment.dueDate && row.consignment.dueDate < today) r.overdue += 1;
    }
    for (const sale of debtSales) {
      const r = sale.partnerId == null ? undefined : map.get(sale.partnerId);
      if (!r) continue;
      r.soldUnpaid += 1;
      r.totalOwed = r.totalOwed.plus(balanceOf(sale.total, sumPaid(sale.payments), sumRefunded(sale.returns)));
    }
    return map;
  }
}

/** Maps a row to the API Partner shape. */
function toPartner(p: Partner) {
  return { id: p.id, name: p.name, phone: p.phone, marketLocation: p.marketLocation, note: p.note };
}

/** Partner plus its computed report numbers (zeroed when the partner has no records). */
function toPartnerReport(p: Partner, n: ReportNumbers | undefined) {
  const numbers = n ?? zero();
  return {
    ...toPartner(p),
    held: numbers.held,
    soldUnpaid: numbers.soldUnpaid,
    totalOwed: numbers.totalOwed.toFixed(2),
    overdue: numbers.overdue,
  };
}
