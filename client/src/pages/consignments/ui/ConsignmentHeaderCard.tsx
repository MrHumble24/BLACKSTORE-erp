import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Calendar, User, Pencil, Clock } from 'lucide-react';
import { Card, CardContent, Button } from '@/shared/ui';
import { formatDate } from '@/shared/lib';
import { isConsignmentOverdue, type Consignment } from '@/entities/consignment';

interface ConsignmentHeaderCardProps {
  consignment: Consignment;
  onEditDueDate: () => void;
}

interface ConsignmentInfoRowProps {
  consignment: Consignment;
  isOverdue: boolean;
  onEditDueDate: () => void;
}

function ConsignmentInfoRow({
  consignment,
  isOverdue,
  onEditDueDate,
}: ConsignmentInfoRowProps) {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
      <div className="flex items-center gap-2 text-slate">
        <Calendar className="h-4 w-4 shrink-0 text-slate" />
        <span>{t('consign.date')}:</span>
        <span className="font-medium text-ink">{formatDate(consignment.date)}</span>
      </div>

      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 shrink-0 text-slate" />
        <span className="text-slate">{t('consign.dueDate')}:</span>
        <span className={`font-medium ${isOverdue ? 'text-destructive font-semibold' : 'text-ink'}`}>
          {formatDate(consignment.dueDate)}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onEditDueDate}
          className="h-6 w-6 p-0 text-slate hover:text-ink"
        >
          <Pencil className="h-3 w-3" />
        </Button>
      </div>

      <div className="flex items-center gap-2 text-slate">
        <User className="h-4 w-4 shrink-0 text-slate" />
        <span>{t('consign.handedBy')}:</span>
        <span className="font-medium text-ink">{consignment.handedBy.name}</span>
      </div>
    </div>
  );
}

/** Header card displaying consignment metadata, partner link, due date and notes. */
export function ConsignmentHeaderCard({
  consignment,
  onEditDueDate,
}: ConsignmentHeaderCardProps) {
  const { t } = useTranslation();
  const isOverdue = isConsignmentOverdue(consignment);

  return (
    <Card className="border-hairline-silver/70 shadow-sm">
      <CardContent className="p-5 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-hairline-silver/60 pb-3">
          <div>
            <span className="text-xs text-slate">{t('consign.partner')}:</span>
            <Link
              to={`/partners/${consignment.partner.id}`}
              className="ml-2 font-semibold text-sm text-ink hover:underline tracking-tight"
            >
              {consignment.partner.name}
            </Link>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono text-slate">
            <span>{t('consign.itemCount')}: <strong className="text-ink">{consignment.itemCount}</strong></span>
            <span>{t('consign.heldCount')}: <strong className="text-ink">{consignment.heldCount}</strong></span>
          </div>
        </div>

        <ConsignmentInfoRow
          consignment={consignment}
          isOverdue={isOverdue}
          onEditDueDate={onEditDueDate}
        />

        {consignment.note && (
          <div className="text-xs text-slate pt-2 border-t border-hairline-silver/40">
            <span className="font-medium text-ink mr-2">{t('consign.note')}:</span>
            {consignment.note}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
