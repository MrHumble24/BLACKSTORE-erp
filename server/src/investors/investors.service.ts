import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InvestorTxType, Prisma, ShareType, TelegramLinkKind } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { LinkTokenService, TelegramLinkResult } from '../telegram-bot/link-token.service';
import { CreateInvestorDto } from './dto/create-investor.dto';
import { UpdateInvestorDto } from './dto/update-investor.dto';

// Everyone sees the summary; money fields (shareType/shareValue/balance) stay hidden.
const summarySelect = {
  id: true,
  name: true,
  code: true,
  isOwn: true,
  isActive: true,
} satisfies Prisma.InvestorSelect;

const fullSelect = {
  ...summarySelect,
  shareType: true,
  shareValue: true,
} satisfies Prisma.InvestorSelect;

type FullInvestor = Prisma.InvestorGetPayload<{ select: typeof fullSelect }>;

/** Investors and their profit-share settings (PRD FR-9, FR-10). Balances are computed, never stored (BR-8). */
@Injectable()
export class InvestorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly linkToken: LinkTokenService,
  ) {}

  /** Summary pick-list; active only unless all=true. Never exposes share or balance. */
  async findAll(all: boolean) {
    const rows = await this.prisma.investor.findMany({
      where: all ? {} : { isActive: true },
      select: summarySelect,
      orderBy: { id: 'asc' },
    });
    // null isOwn (ordinary investors) reads as false to clients.
    return rows.map((r) => Object.assign(r, { isOwn: r.isOwn ?? false }));
  }

  /**
   * Full investor with the computed balance and Telegram link state (`telegramLinked`, when, and the
   * NAME of who issued the link); 404 if missing.
   */
  async findOne(id: number) {
    const row = await this.prisma.investor.findUnique({
      where: { id },
      select: {
        ...fullSelect,
        telegramChatId: true,
        telegramLinkedAt: true,
        telegramLinkedBy: { select: { name: true } },
      },
    });
    if (!row) throw new NotFoundException('Investor not found');
    // Drop the link fields before withBalance spreads the row: the chat id and user ids never leave the server.
    const { telegramChatId, telegramLinkedAt, telegramLinkedBy, ...investor } = row;
    return {
      ...(await this.withBalance(investor)),
      telegramLinked: telegramChatId !== null,
      telegramLinkedAt: telegramLinkedAt?.toISOString() ?? null,
      telegramLinkedBy: telegramLinkedBy?.name ?? null,
    };
  }

  /**
   * Telegram invite link for a real, active investor (F23). Checks run before buildInviteLink, which
   * returns null early with no bot, so the business/inactive refusals hold either way. Already
   * linked → no token is minted. Not audited: issuing a token changes no business record; the actor
   * is stored on the token as its issuer (F24).
   */
  async telegramLink(id: number, actorId: number): Promise<TelegramLinkResult> {
    const investor = await this.prisma.investor.findUnique({
      where: { id },
      select: { isOwn: true, isActive: true, telegramChatId: true },
    });
    if (!investor) throw new NotFoundException('Investor not found');
    if (investor.isOwn) throw new BadRequestException('The business investor cannot be linked');
    if (!investor.isActive) throw new BadRequestException('Inactive investor');
    if (investor.telegramChatId !== null) return { link: null, linked: true };
    return { link: await this.linkToken.buildInviteLink(TelegramLinkKind.INVESTOR, id, actorId), linked: false };
  }

  /** Clears the investor's Telegram link (F24), active or not; 404 unknown, 400 not linked. Audited by LinkTokenService. */
  async telegramUnlink(id: number, actorId: number): Promise<void> {
    const investor = await this.prisma.investor.findUnique({ where: { id }, select: { id: true } });
    if (!investor) throw new NotFoundException('Investor not found');
    await this.linkToken.unlink(TelegramLinkKind.INVESTOR, id, actorId);
  }

  /** Creates an investor. isOwn stays null (only the seeded OWN row is true). Duplicate code → 409. */
  async create(dto: CreateInvestorDto, actorId: number) {
    const shareValue = resolveShareValue(dto.shareType, dto.shareValue);
    const created = await this.prisma.$transaction(async (tx) => {
      const investor = await tx.investor.create({
        data: { name: dto.name, code: dto.code, shareType: dto.shareType, shareValue, isOwn: null },
        select: fullSelect,
      });
      await this.audit.log(
        { userId: actorId, action: 'create', entity: 'Investor', entityId: investor.id, after: investor },
        tx,
      );
      return investor;
    });
    return this.withBalance(created);
  }

  /** Updates an investor; isOwn never changes and the OWN investor can't be deactivated. */
  async update(id: number, dto: UpdateInvestorDto, actorId: number) {
    const before = await this.prisma.investor.findUnique({
      where: { id },
      select: fullSelect,
    });
    if (!before) throw new NotFoundException('Investor not found');
    if (before.isOwn === true && dto.isActive === false) {
      throw new BadRequestException('The OWN investor cannot be deactivated');
    }

    const shareType = dto.shareType ?? before.shareType;
    const shareValue =
      dto.shareType !== undefined || dto.shareValue !== undefined
        ? resolveShareValue(shareType, dto.shareValue ?? before.shareValue.toString())
        : undefined;

    const updated = await this.prisma.$transaction(async (tx) => {
      const investor = await tx.investor.update({
        where: { id },
        data: { name: dto.name, code: dto.code, shareType: dto.shareType, shareValue, isActive: dto.isActive },
        select: fullSelect,
      });
      await this.audit.log(
        { userId: actorId, action: 'update', entity: 'Investor', entityId: id, before, after: investor },
        tx,
      );
      return investor;
    });
    return this.withBalance(updated);
  }

  /** Adds balance (sum deposits − sum payouts) and shapes money fields as decimal strings. */
  private async withBalance(investor: FullInvestor) {
    const groups = await this.prisma.investorTransaction.groupBy({
      by: ['type'],
      where: { investorId: investor.id },
      _sum: { amount: true },
    });
    const sumOf = (type: InvestorTxType) => {
      const { _sum } = groups.find((g) => g.type === type) ?? {};
      return _sum?.amount ?? new Prisma.Decimal(0);
    };
    const balance = sumOf(InvestorTxType.DEPOSIT).minus(sumOf(InvestorTxType.PAYOUT));
    return {
      ...investor,
      isOwn: investor.isOwn ?? false,
      shareValue: investor.shareValue.toFixed(2),
      balance: balance.toFixed(2),
    };
  }
}

/** PERCENT → 0–100; FIXED_PER_ITEM → ≥ 0; NONE → always 0 whatever is sent. */
function resolveShareValue(shareType: ShareType, raw?: string): Prisma.Decimal {
  if (shareType === ShareType.NONE) return new Prisma.Decimal(0);
  const value = new Prisma.Decimal(raw ?? '0');
  if (shareType === ShareType.PERCENT && (value.lt(0) || value.gt(100))) {
    throw new BadRequestException('PERCENT shareValue must be between 0 and 100');
  }
  if (shareType === ShareType.FIXED_PER_ITEM && value.lt(0)) {
    throw new BadRequestException('FIXED_PER_ITEM shareValue must be at least 0');
  }
  return value;
}
