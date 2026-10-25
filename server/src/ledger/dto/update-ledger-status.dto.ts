import { ExpenseStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

/** Admin decision on an EXPENSE (F27): confirm it against profit or exclude it. */
export class UpdateLedgerStatusDto {
  @IsEnum(ExpenseStatus)
  status!: ExpenseStatus;
}
