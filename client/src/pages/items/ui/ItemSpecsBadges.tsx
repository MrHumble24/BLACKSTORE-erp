import type { ReactNode } from 'react';

interface ItemSpecsBadgesProps {
  attributes?: Record<string, string | number> | null;
  className?: string;
}

interface SpecItem {
  key: string;
  kind: 'processor' | 'ram' | 'storage' | 'color' | 'other';
  label: string;
  value: string;
}

const ORDER_WEIGHT: Record<string, number> = {
  processor: 1,
  ram: 2,
  storage: 3,
  color: 4,
};

function classifyKey(rawKey: string): SpecItem['kind'] {
  const k = rawKey.toLowerCase().trim();
  if (k === 'processor' || k === 'cpu') return 'processor';
  if (k === 'ram' || k === 'memory') return 'ram';
  if (k === 'storage' || k === 'ssd' || k === 'rom' || k === 'capacity') return 'storage';
  if (k === 'color' || k === 'colour') return 'color';
  return 'other';
}

function parseAndOrderSpecs(attributes?: Record<string, string | number> | null): SpecItem[] {
  if (!attributes) return [];
  const entries = Object.entries(attributes).filter(
    ([, v]) => v !== undefined && v !== null && String(v).trim().length > 0,
  );
  if (entries.length === 0) return [];

  const items: SpecItem[] = entries.map(([key, val]) => ({
    key,
    kind: classifyKey(key),
    label: key,
    value: String(val).trim(),
  }));

  return items.sort((a, b) => {
    const weightA = ORDER_WEIGHT[a.kind] ?? 99;
    const weightB = ORDER_WEIGHT[b.kind] ?? 99;
    if (weightA !== weightB) return weightA - weightB;
    return a.label.localeCompare(b.label);
  });
}

function renderSpecPill(spec: SpecItem): ReactNode {
  switch (spec.kind) {
    case 'processor':
      return (
        <span
          key={spec.key}
          title={`${spec.label}: ${spec.value}`}
          className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-pricing-blue/10 text-pricing-blue border border-pricing-blue/20 whitespace-nowrap"
        >
          {spec.value}
        </span>
      );
    case 'ram':
    case 'storage':
      return (
        <span
          key={spec.key}
          title={`${spec.label}: ${spec.value}`}
          className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-mono font-medium bg-studio-mist dark:bg-card border border-hairline-silver/70 text-ink whitespace-nowrap"
        >
          {spec.value}
        </span>
      );
    case 'color':
      return (
        <span
          key={spec.key}
          title={`${spec.label}: ${spec.value}`}
          className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] bg-studio-mist/70 dark:bg-card border border-hairline-silver/60 text-slate dark:text-slate-300 whitespace-nowrap"
        >
          {spec.value}
        </span>
      );
    default:
      return (
        <span
          key={spec.key}
          title={`${spec.label}: ${spec.value}`}
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-studio-mist/50 dark:bg-card border border-hairline-silver/50 text-slate whitespace-nowrap"
        >
          <span className="capitalize opacity-80">{spec.label}:</span>
          <span className="text-ink font-medium">{spec.value}</span>
        </span>
      );
  }
}

/** Formats device specs (processor, ram, storage, color, etc.) in exact client-requested order. */
export function ItemSpecsBadges({ attributes, className }: ItemSpecsBadgesProps) {
  const specs = parseAndOrderSpecs(attributes);

  if (specs.length === 0) {
    return <span className="text-slate/60 text-xs">—</span>;
  }

  return (
    <div className={`flex flex-wrap items-center gap-1 max-w-[280px] ${className ?? ''}`}>
      {specs.map(renderSpecPill)}
    </div>
  );
}
