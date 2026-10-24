import { useTranslation } from 'react-i18next';
import { Switch } from '@/shared/ui';
import type { TelegramFeatures } from '@/entities/integrations';

interface FeatureTogglesProps {
  enabled: boolean;
  features: TelegramFeatures;
  onEnabledChange: (value: boolean) => void;
  onFeatureChange: (key: keyof TelegramFeatures, value: boolean) => void;
  disabled?: boolean;
}

/** One labelled row with a switch on the right. */
function ToggleRow({
  label,
  description,
  checked,
  onCheckedChange,
  disabled,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="space-y-0.5">
        <p className="text-sm font-medium text-ink">{label}</p>
        {description && <p className="text-[11px] text-slate">{description}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
    </div>
  );
}

/**
 * Master Enabled switch plus one row per feature flag. Feature rows are rendered from the
 * config object, so a new flag appears automatically once the backend adds it.
 */
export function FeatureToggles({
  enabled,
  features,
  onEnabledChange,
  onFeatureChange,
  disabled,
}: FeatureTogglesProps) {
  const { t } = useTranslation();
  const featureKeys = Object.keys(features) as (keyof TelegramFeatures)[];

  return (
    <div className="divide-y divide-hairline-silver/50">
      <ToggleRow
        label={t('telegram.enabled')}
        description={t('telegram.enabledHint')}
        checked={enabled}
        onCheckedChange={onEnabledChange}
        disabled={disabled}
      />
      {featureKeys.map((key) => (
        <ToggleRow
          key={key}
          label={t(`telegram.features.${key}`)}
          checked={features[key]}
          onCheckedChange={(value) => onFeatureChange(key, value)}
          disabled={disabled || !enabled}
        />
      ))}
    </div>
  );
}
