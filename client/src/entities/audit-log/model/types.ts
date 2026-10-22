import type { Page } from '@/shared/types';

export type { Page };

export interface AuditEntry {
  id: number;
  createdAt: string;
  user: { id: number; name: string };
  action: string;
  entity: string;
  entityId: number;
  before: unknown | null;
  after: unknown | null;
}

export interface AuditFilters {
  entity?: string;
  entityId?: number;
  userId?: number;
  action?: string;
  from?: string;
  to?: string;
}
