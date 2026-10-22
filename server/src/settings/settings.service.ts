import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateReceiptDto } from './dto/update-receipt.dto';

const RECEIPT_KEY = 'receipt';

/** The receipt header the frontend prints on (PRD FR-24). One Setting row, key "receipt". */
export interface ReceiptSettings {
  shopName: string;
  address: string;
  phone: string;
  footer: string;
}

const EMPTY_RECEIPT: ReceiptSettings = { shopName: '', address: '', phone: '', footer: '' };

/** Reads and writes app settings stored as JSON key-value rows. */
@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** Current receipt header, or empty strings until an Admin sets it. */
  async getReceipt(): Promise<ReceiptSettings> {
    const row = await this.prisma.setting.findUnique({ where: { key: RECEIPT_KEY } });
    return { ...EMPTY_RECEIPT, ...(row?.value as Partial<ReceiptSettings> | undefined) };
  }

  /** Merges the given fields into the receipt header and upserts the row, with an audit entry. */
  async updateReceipt(dto: UpdateReceiptDto, actorId: number): Promise<ReceiptSettings> {
    const before = await this.getReceipt();
    const value: ReceiptSettings = { ...before, ...dto };
    await this.prisma.$transaction(async (tx) => {
      await tx.setting.upsert({
        where: { key: RECEIPT_KEY },
        create: { key: RECEIPT_KEY, value: value as unknown as Prisma.InputJsonObject },
        update: { value: value as unknown as Prisma.InputJsonObject },
      });
      await this.audit.log(
        { userId: actorId, action: 'update', entity: 'Setting', entityId: 0, before, after: value },
        tx,
      );
    });
    return value;
  }
}
