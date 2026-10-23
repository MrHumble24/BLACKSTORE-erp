import { Type } from 'class-transformer';
import { IsInt, IsOptional, Matches, Min } from 'class-validator';

/** Investor report for one month (YYYY-MM); `investorId` narrows to a single investor. */
export class QueryInvestorReportDto {
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'month must be YYYY-MM' })
  month!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  investorId?: number;
}
