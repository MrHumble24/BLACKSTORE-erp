import { useTranslation } from 'react-i18next';
import { FileDown } from 'lucide-react';
import { API_BASE_URL } from '@/shared/api';

/** "Download template" link; the .xlsx endpoint serves it as an attachment (FR-7). */
export function TemplateLink() {
  const { t } = useTranslation();

  return (
    <a
      href={`${API_BASE_URL}/items/import/template`}
      download
      className="inline-flex h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-hairline-silver bg-gallery-white px-4 text-xs font-normal text-ink shadow-none transition-colors hover:border-steel hover:bg-studio-mist"
    >
      <FileDown className="h-3 w-3 text-apple-blue" />
      <span>{t('importStock.template')}</span>
    </a>
  );
}
