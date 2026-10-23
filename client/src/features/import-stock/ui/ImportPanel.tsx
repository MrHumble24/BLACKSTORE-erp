import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload } from 'lucide-react';
import { Button, FormError } from '@/shared/ui';
import { useSubmitWithError } from '@/shared/lib';
import { useImportItems, type ImportResult } from '@/entities/stock-import';
import { TemplateLink } from './TemplateLink';
import { ImportResultCard } from './ImportResultCard';

/** Server also enforces 5 MB; the client check avoids the upload round-trip. */
const MAX_IMPORT_FILE_BYTES = 5 * 1024 * 1024;

/** Pill that opens the hidden .xlsx picker and shows the chosen file's name. */
function FilePicker({ file, onFileChange, disabled }: { file: File | null; onFileChange: (file: File | null) => void; disabled: boolean }) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="inline-flex items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx"
        className="hidden"
        onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
      />
      <Button
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        className="h-8 px-4 rounded-full border-hairline-silver bg-gallery-white text-xs font-normal gap-1.5"
      >
        <Upload className="h-3 w-3 text-apple-blue" />
        <span>{t('importStock.chooseFile')}</span>
      </Button>
      {file && <span className="text-[11px] text-slate">{file.name}</span>}
    </div>
  );
}

/**
 * Stock import panel (FR-7): template link, .xlsx picker (≤ 5 MB), import button
 * and the result card listing skipped rows. manage_prices only (route-gated).
 */
export function ImportPanel() {
  const { t } = useTranslation();
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const { mutateAsync, isPending } = useImportItems();
  const { error, setError, runWithCatch } = useSubmitWithError();

  const onImport = () => {
    // The button is disabled without a file; `accept` is advisory, so check the extension too.
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      setError(t('importStock.wrongType'));
      return;
    }
    if (file.size > MAX_IMPORT_FILE_BYTES) {
      setError(t('importStock.fileTooLarge'));
      return;
    }
    void runWithCatch(() => mutateAsync(file)).then((imported) => {
      if (imported) setResult(imported);
    });
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <TemplateLink />
        <FilePicker file={file} onFileChange={setFile} disabled={isPending} />
        <Button onClick={onImport} disabled={isPending || !file} className="sm:ml-auto">
          {isPending ? t('common.loading') : t('importStock.import')}
        </Button>
      </div>
      <FormError message={error} />
      {result && <ImportResultCard result={result} />}
    </section>
  );
}
