import { IsISO8601, ValidateIf } from 'class-validator';

/** Change (or clear) a consignment's due date; null = no time limit. */
export class UpdateConsignmentDto {
  @ValidateIf((_, value) => value !== null)
  @IsISO8601()
  dueDate!: string | null;
}
