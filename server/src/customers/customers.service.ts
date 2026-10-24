import { Injectable, NotFoundException } from '@nestjs/common';
import { Customer, Prisma, SaleStatus, TelegramLinkKind } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { debtBalanceOf, debtSaleSelect } from '../sales/sale-totals';
import { LinkTokenService, TelegramLinkResult } from '../telegram-bot/link-token.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { QueryCustomersDto } from './dto/query-customers.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

/** Customers for sales and debt tracking (PRD FR-21). Debt is computed from records, never stored (BR-8). */
@Injectable()
export class CustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly linkToken: LinkTokenService,
  ) {}

  /**
   * Paginated, newest-first list; `search` matches name or phone (case-insensitive contains).
   * Each row carries `debtBalance` (BR-8); `hasDebt` keeps only customers who still owe money.
   */
  async findAll(query: QueryCustomersDto) {
    const where: Prisma.CustomerWhereInput = {
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search.trim(), mode: 'insensitive' } },
              { phone: { contains: query.search.trim(), mode: 'insensitive' } },
            ],
          }
        : {}),
      // A customer owes money iff they have a DEBT sale: any sale with a positive
      // balance stays DEBT, so this is exactly debtBalance > 0 and keeps paging correct.
      ...(query.hasDebt ? { sales: { some: { status: SaleStatus.DEBT } } } : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.customer.findMany({
        where,
        orderBy: { id: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.customer.count({ where }),
    ]);
    const debtByCustomer = await this.debtByCustomerId(rows.map((c) => c.id));
    // toCustomer returns a fresh object per row, so assigning debtBalance onto it is safe.
    const items = rows.map((c) =>
      Object.assign(toCustomer(c), {
        debtBalance: (debtByCustomer.get(c.id) ?? new Prisma.Decimal(0)).toFixed(2),
      }),
    );
    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  /**
   * Outstanding debt per customer id for the whole page in one query (BR-8, no N+1).
   * Ids with no unpaid sales are absent from the map (treated as zero by the caller).
   */
  private async debtByCustomerId(ids: number[]): Promise<Map<number, Prisma.Decimal>> {
    const map = new Map<number, Prisma.Decimal>();
    if (ids.length === 0) return map;
    const debtSales = await this.prisma.sale.findMany({
      where: { customerId: { in: ids }, status: SaleStatus.DEBT },
      select: { customerId: true, ...debtSaleSelect },
    });
    for (const s of debtSales) {
      if (s.customerId == null) continue;
      const balance = debtBalanceOf(s);
      map.set(s.customerId, (map.get(s.customerId) ?? new Prisma.Decimal(0)).plus(balance));
    }
    return map;
  }

  /**
   * One customer with their current debt (Σ balance of their DEBT sales) and Telegram link state
   * (when, and the NAME of who issued the link; never ids or the chat id); 404 if missing.
   */
  async findOne(id: number) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: { telegramLinkedBy: { select: { name: true } } },
    });
    if (!customer) throw new NotFoundException('Customer not found');
    // One query loads every unpaid sale's total, payments and refunds for the BR-8 sum.
    const debtSales = await this.prisma.sale.findMany({
      where: { customerId: id, status: SaleStatus.DEBT },
      select: debtSaleSelect,
    });
    const debt = debtSales.reduce(
      (sum, s) => sum.plus(debtBalanceOf(s)),
      new Prisma.Decimal(0),
    );
    // Only whether a chat is linked is exposed; the chat id itself never leaves the server.
    return {
      ...toCustomer(customer),
      debt: debt.toFixed(2),
      telegramLinked: customer.telegramChatId !== null,
      telegramLinkedAt: customer.telegramLinkedAt?.toISOString() ?? null,
      telegramLinkedBy: customer.telegramLinkedBy?.name ?? null,
    };
  }

  /**
   * Telegram invite link for this customer (F23). Already linked → no token is minted, so a staff
   * member can't take over a linked chat (same rule as the sale detail). `link` is null when no bot
   * is configured. Not audited: issuing a token changes no business record; the actor is stored on the
   * token as its issuer (F24).
   */
  async telegramLink(id: number, actorId: number): Promise<TelegramLinkResult> {
    const customer = await this.prisma.customer.findUnique({ where: { id }, select: { telegramChatId: true } });
    if (!customer) throw new NotFoundException('Customer not found');
    if (customer.telegramChatId !== null) return { link: null, linked: true };
    return { link: await this.linkToken.buildInviteLink(TelegramLinkKind.CUSTOMER, id, actorId), linked: false };
  }

  /** Clears the customer's Telegram link (F24); 404 unknown, 400 not linked. Audited by LinkTokenService. */
  async telegramUnlink(id: number, actorId: number): Promise<void> {
    const customer = await this.prisma.customer.findUnique({ where: { id }, select: { id: true } });
    if (!customer) throw new NotFoundException('Customer not found');
    await this.linkToken.unlink(TelegramLinkKind.CUSTOMER, id, actorId);
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
