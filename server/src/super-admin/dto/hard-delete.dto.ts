import { IsIn, IsInt, IsPositive, IsString, MinLength } from 'class-validator';

/** The three things a super admin may permanently delete (cascade down). */
export const HARD_DELETE_TYPES = ['item', 'productModel', 'category'] as const;
export type HardDeleteType = (typeof HARD_DELETE_TYPES)[number];

/** Target of a hard delete / preview: one item, product model or category. */
export class HardDeletePreviewDto {
  @IsIn(HARD_DELETE_TYPES)
  type!: HardDeleteType;

  @IsInt()
  @IsPositive()
  id!: number;
}

/** Execute a hard delete: same target plus the caller's password for re-authentication. */
export class HardDeleteDto extends HardDeletePreviewDto {
  @IsString()
  @MinLength(1)
  password!: string;
}
