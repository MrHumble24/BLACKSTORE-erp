import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Printer } from 'lucide-react';
import type { Item } from '@/entities/item';

/**
 * "Print label" button on the item details page (FR-15): it just links to the label
 * route, which generates the system code itself if needed.
 */
export function LabelPrintButton({ item }: { item: Item }) {
  const { t } = useTranslation();

  return (
    <Link
      to={`/items/${item.id}/label`}
      className="inline-flex h-7 cursor-pointer items-center justify-center gap-1 whitespace-nowrap rounded-full border border-hairline-silver bg-gallery-white px-3 text-xs font-normal text-ink shadow-none transition-colors hover:border-steel hover:bg-studio-mist"
    >
      <Printer className="h-3 w-3 text-apple-blue" />
      <span>{t('labels.print')}</span>
    </Link>
  );
}
