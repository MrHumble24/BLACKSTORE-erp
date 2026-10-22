import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronRight } from 'lucide-react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
  TableLoadingRow, TableEmptyRow,
} from '@/shared/ui';
import { formatDateTime } from '@/shared/lib';
import type { AuditEntry } from '@/entities/audit-log';

/** Pretty-prints a before/after payload as read-only JSON, or a dash when absent. */
function JsonBlock({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-medium text-slate">{label}</p>
      <pre className="overflow-auto rounded-xl bg-studio-mist/60 p-3 text-[11px] text-ink">
        {value == null ? '—' : JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}

/** One audit row; clicking it expands a read-only before/after view. */
function AuditRow({ entry }: { entry: AuditEntry }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <>
      <TableRow className="border-b border-hairline-silver/40 hover:bg-studio-mist/60 cursor-pointer" onClick={() => setOpen((o) => !o)}>
        <TableCell className="text-xs text-slate">
          <span className="inline-flex items-center gap-1.5">
            {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            {formatDateTime(entry.createdAt)}
          </span>
        </TableCell>
        <TableCell className="text-xs text-slate">{entry.user.name}</TableCell>
        <TableCell className="text-xs text-ink">{entry.action}</TableCell>
        <TableCell className="text-xs text-ink">{entry.entity} #{entry.entityId}</TableCell>
      </TableRow>
      {open && (
        <TableRow className="border-b border-hairline-silver/40">
          <TableCell colSpan={4} className="bg-gallery-white">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
              <JsonBlock label={t('auditLog.before')} value={entry.before} />
              <JsonBlock label={t('auditLog.after')} value={entry.after} />
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

/** Audit log table: time, user, action, entity + id, each row expandable (read-only). */
export function AuditLogTable({ entries, isLoading }: { entries: AuditEntry[]; isLoading: boolean }) {
  const { t } = useTranslation();
  return (
    <div className="rounded-[28px] border border-hairline-silver/70 bg-gallery-white overflow-hidden shadow-none p-1">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-hairline-silver/60 hover:bg-transparent">
            <TableHead>{t('auditLog.time')}</TableHead>
            <TableHead>{t('auditLog.user')}</TableHead>
            <TableHead>{t('auditLog.action')}</TableHead>
            <TableHead>{t('auditLog.entity')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && <TableLoadingRow colSpan={4} />}
          {!isLoading && entries.length === 0 && (
            <TableEmptyRow colSpan={4} message={t('auditLog.noEntries')} />
          )}
          {!isLoading && entries.map((entry) => <AuditRow key={entry.id} entry={entry} />)}
        </TableBody>
      </Table>
    </div>
  );
}
