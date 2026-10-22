import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem, Input,
} from '@/shared/ui';
import { useUsers } from '@/entities/user';
import type { AuditFilters } from '@/entities/audit-log';

interface Props {
  filters: AuditFilters;
  onChange: (filters: AuditFilters) => void;
}

/** Exact-match filters for the audit log: entity, entity id, user, action, from/to. */
export function AuditLogFilters({ filters, onChange }: Props) {
  const { t } = useTranslation();
  const { data: usersPage } = useUsers(1, 100);
  const users = usersPage?.items ?? [];
  const [entity, setEntity] = useState(filters.entity ?? '');
  const [entityId, setEntityId] = useState(filters.entityId ? String(filters.entityId) : '');
  const [action, setAction] = useState(filters.action ?? '');

  const applyText = () =>
    onChange({
      ...filters,
      entity: entity.trim() || undefined,
      entityId: entityId.trim() ? Number(entityId) : undefined,
      action: action.trim() || undefined,
    });

  return (
    <div className="flex flex-wrap items-center gap-2.5 pt-1">
      <Input value={entity} onChange={(e) => setEntity(e.target.value)} onBlur={applyText}
        placeholder={t('auditLog.entity')} className="w-36 h-8 text-xs rounded-full" />
      <Input value={entityId} onChange={(e) => setEntityId(e.target.value)} onBlur={applyText}
        placeholder={t('auditLog.entityId')} className="w-28 h-8 text-xs rounded-full" />
      <div className="w-40">
        <Select
          value={filters.userId ? String(filters.userId) : 'ALL'}
          onValueChange={(v) => onChange({ ...filters, userId: v === 'ALL' ? undefined : Number(v) })}
        >
          <SelectTrigger className="h-8 text-xs rounded-full">
            <SelectValue placeholder={t('auditLog.allUsers')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t('auditLog.allUsers')}</SelectItem>
            {users.map((u) => (
              <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Input value={action} onChange={(e) => setAction(e.target.value)} onBlur={applyText}
        placeholder={t('auditLog.action')} className="w-32 h-8 text-xs rounded-full" />
      <Input type="date" value={filters.from ?? ''}
        onChange={(e) => onChange({ ...filters, from: e.target.value || undefined })}
        className="w-40 h-8 text-xs rounded-full" />
      <Input type="date" value={filters.to ?? ''}
        onChange={(e) => onChange({ ...filters, to: e.target.value || undefined })}
        className="w-40 h-8 text-xs rounded-full" />
    </div>
  );
}
