import { useTranslation } from 'react-i18next';
import { Button } from './button';

interface TablePaginationProps {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (p: number) => void;
}

/** Apple-styled pagination control bar with totals and previous/next buttons. */
export function TablePagination({
  page,
  totalPages,
  total,
  onPageChange,
}: TablePaginationProps) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 border-t border-hairline-silver/60 bg-gallery-white px-4 sm:px-6 py-3 text-xs text-slate">
      <div className="self-start sm:self-auto text-[11px] sm:text-xs">
        {t('common.total')}: <span className="font-semibold text-ink">{total}</span>
      </div>
      <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-3 sm:gap-4">
        <span>
          {t('common.page')} <span className="font-medium text-ink">{page}</span>{' '}
          {t('common.of')} <span className="font-medium text-ink">{totalPages}</span>
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="h-7.5 px-3 rounded-full text-xs"
          >
            {t('common.previous')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="h-7.5 px-3 rounded-full text-xs"
          >
            {t('common.next')}
          </Button>
        </div>
      </div>
    </div>
  );
}
