interface ReportSkeletonProps {
  variant: 'profit' | 'investor';
}

const PULSE = 'animate-pulse rounded-[28px] bg-studio-mist';

/** Placeholder blocks matching the reports layout shape while data loads. */
export function ReportSkeleton({ variant }: ReportSkeletonProps) {
  return (
    <div className="space-y-4" aria-hidden>
      {variant === 'profit' ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className={`${PULSE} min-h-44 sm:col-span-2 lg:col-span-2`} />
            <div className={`${PULSE} min-h-44 sm:col-span-2 lg:col-span-3`} />
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className={`${PULSE} h-80 lg:col-span-2`} />
            <div className={`${PULSE} h-80`} />
          </div>
          <div className={`${PULSE} h-56`} />
        </>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((index) => (
            <div key={index} className={`${PULSE} h-32`} />
          ))}
        </div>
      )}
      <div className={`${PULSE} h-64`} />
    </div>
  );
}
