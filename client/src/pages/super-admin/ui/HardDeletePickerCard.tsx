import { useTranslation } from 'react-i18next';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  FormError,
} from '@/shared/ui';
import type { HardDeleteReport } from '@/entities/super-admin';
import type { useHardDeleteFlow } from '../model/useHardDeleteFlow';
import { HardDeleteTargetPicker } from './HardDeleteTargetPicker';
import { HardDeletePreview } from './HardDeletePreview';

/** Preview result + the button that opens the final confirm dialog. */
function PreviewResultBlock({ report, onContinue }: { report: HardDeleteReport; onContinue: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-5 border-t border-hairline-silver/70 pt-5">
      <HardDeletePreview report={report} />
      <Button variant="destructive" onClick={onContinue}>
        {t('hardDelete.continueToDelete')}
      </Button>
    </div>
  );
}

interface HardDeletePickerCardProps {
  flow: ReturnType<typeof useHardDeleteFlow>;
  onContinue: () => void;
}

/** Card holding the target picker, preview error and the preview result block. */
export function HardDeletePickerCard({ flow, onContinue }: HardDeletePickerCardProps) {
  const { t } = useTranslation();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('hardDelete.pickTarget')}</CardTitle>
        <CardDescription>{t('hardDelete.pickTargetHint')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <HardDeleteTargetPicker
          type={flow.type}
          onTypeChange={flow.changeType}
          id={flow.id}
          onIdChange={flow.changeId}
          onPreview={flow.runPreview}
          isPending={flow.isPending}
        />
        <FormError message={flow.error} />
        {flow.report && flow.target && (
          <PreviewResultBlock report={flow.report} onContinue={onContinue} />
        )}
      </CardContent>
    </Card>
  );
}
