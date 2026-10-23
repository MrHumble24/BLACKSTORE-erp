import { getTodayIso } from '@/shared/lib';
import type { ConsignmentSummary } from '../model/types';

/** A consignment is overdue when its due date has passed and the partner still holds items. */
export function isConsignmentOverdue(c: ConsignmentSummary): boolean {
  return Boolean(c.dueDate && c.dueDate < getTodayIso() && c.heldCount > 0);
}
