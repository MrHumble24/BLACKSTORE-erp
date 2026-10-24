const PULSE = 'animate-pulse rounded-2xl bg-studio-mist';

/** Placeholder blocks matching the dashboard layout while the summary loads. */
export function HomeSkeleton() {
  return (
    <div className="space-y-5" aria-hidden>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`${PULSE} h-24`} />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className={`${PULSE} h-64`} />
        <div className={`${PULSE} h-64`} />
      </div>
    </div>
  );
}
