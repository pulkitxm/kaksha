function Bar({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

export function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-line bg-panel p-4"
          aria-hidden="true"
        >
          <Bar className="h-3 w-20" />
          <Bar className="mt-3 h-7 w-14" />
        </div>
      ))}
    </div>
  );
}

export function FilterBarSkeleton() {
  return (
    <div
      className="rounded-xl border border-line bg-panel p-3"
      aria-hidden="true"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Bar className="h-9 w-full max-w-xs" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Bar key={i} className="h-9 w-28" />
        ))}
      </div>
    </div>
  );
}

export function GridSkeleton({
  rows = 6,
  cols = 9,
}: {
  rows?: number;
  cols?: number;
}) {
  return (
    <div
      className="overflow-hidden rounded-xl border border-line bg-panel"
      aria-hidden="true"
    >
      <div className="flex border-b border-line bg-bg-subtle">
        <div className="w-28 shrink-0 border-r border-line p-3">
          <Bar className="h-4 w-16" />
        </div>
        <div className="flex flex-1">
          {Array.from({ length: cols }).map((_, i) => (
            <div key={i} className="flex-1 border-r border-line p-3 last:border-r-0">
              <Bar className="mx-auto h-4 w-6" />
            </div>
          ))}
        </div>
      </div>

      {Array.from({ length: rows }).map((_, row) => (
        <div key={row} className="flex border-b border-line last:border-b-0">
          <div className="w-28 shrink-0 border-r border-line p-3">
            <Bar className="h-8 w-8 rounded-lg" />
            <Bar className="mt-2 h-3 w-16" />
          </div>
          <div className="flex flex-1">
            {Array.from({ length: cols }).map((_, col) => (
              <div
                key={col}
                className="flex-1 space-y-2 border-r border-line p-2.5 last:border-r-0"
              >
                <Bar className="h-3 w-10" />
                <Bar className="h-4 w-full" />
                {(row + col) % 3 === 0 ? <Bar className="h-3 w-3/4" /> : null}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div
      className="overflow-hidden rounded-xl border border-line bg-panel"
      aria-hidden="true"
    >
      <div className="border-b border-line bg-bg-subtle p-3">
        <Bar className="h-4 w-40" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 border-b border-line p-3 last:border-b-0"
        >
          <Bar className="h-8 w-8 shrink-0 rounded-full" />
          <Bar className="h-4 w-40" />
          <Bar className="h-4 flex-1" />
          <Bar className="h-4 w-12" />
        </div>
      ))}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-6">
      <StatsSkeleton />
      <GridSkeleton />
    </div>
  );
}
