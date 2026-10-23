import { IsNotEmpty, IsString } from 'class-validator';

/** Body for POST /backups/:fileName/restore; `confirm` must repeat the file name as a safeguard. */
export class RestoreBackupDto {
  @IsString()
  @IsNotEmpty()
  confirm!: string;
}
