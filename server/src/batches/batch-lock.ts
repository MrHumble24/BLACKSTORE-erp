import { ForbiddenException } from '@nestjs/common';
import type { PublicUser } from '../common/auth-user';
import { startOfToday } from '../common/dates';
import { hasPermission } from '../common/permissions';

// A batch may be edited freely for this many days after arrival; older ones are
// "past records" and editing them needs edit_past_records (FR-29).
export const BATCH_EDIT_DAYS = 3;

/** True when the batch arrived before the start of today − BATCH_EDIT_DAYS (locked). */
export function isPastBatch(batch: { arrivalDate: Date }): boolean {
  const cutoff = startOfToday();
  cutoff.setDate(cutoff.getDate() - BATCH_EDIT_DAYS);
  return batch.arrivalDate.getTime() < cutoff.getTime();
}

/** 403 when a past batch is edited without edit_past_records; no-op for a recent batch (FR-29). */
export function assertBatchEditable(batch: { arrivalDate: Date }, actor: PublicUser): void {
  if (isPastBatch(batch) && !hasPermission(actor, 'edit_past_records')) {
    throw new ForbiddenException(
      'This batch is older than 3 days; editing it requires the edit_past_records permission',
    );
  }
}
