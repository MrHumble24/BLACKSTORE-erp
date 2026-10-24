import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Printer } from 'lucide-react';

interface BatchLabelsButtonProps {
  batchId: number;
  deviceCount: number;
}

/**
 * "Print all labels" button on the batch details page (FR-15):
 * opens /batches/:id/labels in a new window for continuous 50×30 mm thermal printing.
 */
export function BatchLabelsButton({ batchId, deviceCount }: BatchLabelsButtonProps) {
  const { t } = useTranslation();

  if (deviceCount <= 0) return null;

  return (
    <Link
      to={`/batches/${batchId}/labels`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-hairline-silver bg-gallery-white px-4 text-xs font-normal text-ink shadow-none transition-colors hover:border-steel hover:bg-studio-mist"
    >
      <Printer className="h-3 w-3 text-apple-blue" />
      <span>{t('labels.printBatchLabels', { count: deviceCount })}</span>
    </Link>
  );
}
