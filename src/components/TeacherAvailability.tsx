import type { Day, TeacherAvailabilityRow } from "@/lib/types";

type Props = {
  rows: TeacherAvailabilityRow[];
  days: Day[];
  periodsPerDay: number;
};

export function TeacherAvailability({ rows, days, periodsPerDay }: Props) {
  if (rows.length === 0) return null;

  const totalSlots = periodsPerDay * days.length;

  return (
    <details className="group overflow-hidden rounded-xl border border-line bg-panel" open>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 border-b border-line bg-bg-subtle px-4 py-2.5">
        <div>
          <h2 className="text-sm font-medium">Free periods per teacher</h2>
          <p className="mt-0.5 text-xs text-fg-muted">
            Out of {periodsPerDay} periods a day, {totalSlots} a week. Counted across the
            whole class, not just the filtered rows.
          </p>
        </div>
        <svg
          viewBox="0 0 16 16"
          className="h-4 w-4 shrink-0 text-fg-faint transition-transform group-open:rotate-180"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          aria-hidden="true"
        >
          <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </summary>

      <div className="scrollbar-thin overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="text-[11px] uppercase tracking-wider text-fg-faint">
              <th scope="col" className="border-b border-line px-4 py-2 text-left font-medium">
                Teacher
              </th>
              {days.map((day) => (
                <th
                  key={day.id}
                  scope="col"
                  className="border-b border-line px-2 py-2 text-center font-medium"
                >
                  {day.short}
                </th>
              ))}
              <th scope="col" className="border-b border-line px-4 py-2 text-right font-medium">
                Free / week
              </th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => (
              <tr
                key={row.teacherId}
                className="border-b border-line last:border-b-0 hover:bg-panel-hover"
              >
                <td className="px-4 py-2 font-medium">{row.teacher}</td>

                {row.perDay.map((day) => {
                  const full = day.free === 0;
                  return (
                    <td key={day.dayId} className="px-2 py-2 text-center">
                      <span
                        title={`${day.busy} teaching, ${day.free} free`}
                        className={`inline-flex h-7 w-10 items-center justify-center rounded-md font-mono text-xs tabular-nums ${
                          full
                            ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                            : day.free === periodsPerDay
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : "bg-bg-subtle text-fg"
                        }`}
                      >
                        {day.free}
                      </span>
                    </td>
                  );
                })}

                <td className="px-4 py-2 text-right">
                  <span className="font-mono text-sm tabular-nums">{row.totalFree}</span>
                  <span className="ml-1 text-xs text-fg-faint">/ {totalSlots}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
