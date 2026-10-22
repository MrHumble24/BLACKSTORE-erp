import { Injectable, NotFoundException } from '@nestjs/common';
import { Customer, Prisma, SaleStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { balanceOf, sumPaid, sumRefunded } from '../sales/sale-totals';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { QueryCustomersDto } from './dto/query-customers.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

/** Customers for sales and debt tracking (PRD FR-21). Debt is computed from records, never stored (BR-8). */
@Injectable()
export class CustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** Paginated, newest-first list; `search` matches name or phone (case-insensitive contains). */
  async findAll(query: QueryCustomersDto) {
    const where: Prisma.CustomerWhereInput = query.search
      ? {
          OR: [
            { name: { contains: query.search.trim(), mode: 'insensitive' } },
            { phone: { contains: query.search.trim(), mode: 'insensitive' } },
          ],
        }
      : {};
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.customer.findMany({
        where,
        orderBy: { id: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.customer.count({ where }),
    ]);
    return { items: rows.map(toCustomer), total, page: query.page, pageSize: query.pageSize };
  }

  /** One customer with their current debt (Σ balance of their DEBT sales); 404 if missing. */
  async findOne(id: number) {
    const customer = await this.prisma.customer.findUnique({ where: { id } });
    if (!customer) throw new NotFoundException('Customer not found');
    // One query loads every unpaid sale's total, payments and refunds for the BR-8 sum.
    const debtSales = await this.prisma.sale.findMany({
      where: { customerId: id, status: SaleStatus.DEBT },
      select: {
        total: true,
        payments: { select: { amount: true } },
        returns: { select: { refundAmount: true } },
      },
    });
    const debt = debtSales.reduce(
      (sum, s) => sum.plus(balanceOf(s.total, sumPaid(s.payments), sumRefunded(s.returns))),
      new Prisma.Decimal(0),
    );
    return { ...toCustomer(customer), debt: debt.toFixed(2) };
  }

  /** Creates a customer; the phone is trimmed and unique (409 via the Prisma filter). */
  async create(dto: CreateCustomerDto, actorId: number) {
    const created = await this.prisma.$transaction(async (tx) => {
      const customer = await tx.customer.create({
        data: { name: dto.name.trim(), phone: dto.phone.trim(), note: dto.note },
      });
      await this.audit.log(
        { userId: actorId, action: 'create', entity: 'Customer', entityId: customer.id, after: customer },
        tx,
      );
      return customer;
    });
    return toCustomer(created);
  }

  /** Edits a customer; a duplicate phone is a 409. */
  async update(id: number, dto: UpdateCustomerDto, actorId: number) {
    const updated = await this.prisma.$transaction(async (tx) => {
      const before = await tx.customer.findUnique({ where: { id } });
      if (!before) throw new NotFoundException('Customer not found');
      const customer = await tx.customer.update({
        where: { id },
        data: { name: dto.name?.trim(), phone: dto.phone?.trim(), note: dto.note },
      });
      await this.audit.log(
        { userId: actorId, action: 'update', entity: 'Customer', entityId: id, before, after: customer },
        tx,
      );
      return customer;
    });
    return toCustomer(updated);
  }
}

/** Maps a row to the API Customer shape (createdAt as an ISO string). */
function toCustomer(c: Customer) {
  return { id: c.id, name: c.name, phone: c.phone, note: c.note, createdAt: c.createdAt.toISOString() };
}
