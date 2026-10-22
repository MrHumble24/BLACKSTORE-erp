import { IsString, MaxLength } from 'class-validator';

/** Path param for scan lookup; caps the identifier length before it hits the DB. */
export class CodeParamDto {
  @IsString()
  @MaxLength(40)
  code!: string;
}
