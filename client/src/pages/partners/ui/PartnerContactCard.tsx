import { useTranslation } from 'react-i18next';
import { Pencil, MapPin, Phone, StickyNote } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Button } from '@/shared/ui';
import type { PartnerReport } from '@/entities/partner';

interface PartnerContactCardProps {
  partner: PartnerReport;
  onEdit: () => void;
}

/** Contact information card for a partner with inline edit action. */
export function PartnerContactCard({ partner, onEdit }: PartnerContactCardProps) {
  const { t } = useTranslation();

  return (
    <Card className="border-hairline-silver/70 shadow-sm">
      <CardHeader className="py-3 px-4 border-b border-hairline-silver/60 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-semibold">{t('partners.contactInfo')}</CardTitle>
        <Button variant="ghost" size="sm" onClick={onEdit} className="h-7 text-xs gap-1">
          <Pencil className="h-3 w-3" />
          {t('common.edit')}
        </Button>
      </CardHeader>
      <CardContent className="p-4 space-y-2.5 text-xs">
        <div className="flex items-center gap-2 text-slate">
          <Phone className="h-3.5 w-3.5 shrink-0" />
          <span className="font-mono text-ink">{partner.phone || '—'}</span>
        </div>
        <div className="flex items-center gap-2 text-slate">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span className="text-ink">{partner.marketLocation || '—'}</span>
        </div>
        {partner.note && (
          <div className="flex items-start gap-2 text-slate pt-1 border-t border-hairline-silver/40">
            <StickyNote className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span className="text-ink">{partner.note}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
