/** One backup file: an encrypted pg_dump sent to Telegram and copied off-disk (FR-31). */
export interface Backup {
  fileName: string;
  /** Size in bytes; the UI renders it as KB/MB. */
  size: number;
  createdAt: string;
  sentToTelegram: boolean;
  secondCopy: boolean;
}

/** Result of a restore: which file was restored and the safety backup taken first (FR-31). */
export interface RestoreResult {
  restoredFrom: string;
  safetyBackup: string;
  finishedAt: string;
}

/** Confirm payload; the contract requires it to equal the restored file name. */
export interface RestorePayload {
  fileName: string;
  confirm: string;
}
