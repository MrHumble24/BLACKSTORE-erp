import { IsString, Length } from 'class-validator';

/** Record one scanned code in a stock count (normalized in the service). */
export class CreateScanDto {
  @IsString()
  @Length(1, 40)
  code!: string;
}
