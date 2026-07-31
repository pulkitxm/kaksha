import { swatch } from "@/lib/colors";
import { dayNames, formatDayRange } from "@/lib/format";
import type { Day, Period, ResolvedEntry, Section } from "@/lib/types";

type Props = {
  entries: ResolvedEntry[];
  sections: Section[];
  periods: Period[];
  days: Day[];
};

export function ListView({ entries, sections, periods, days }: Props) {
  const sectionById = new Map(sections.map((s) => [s.id, s]));
  const periodById = new Map(periods.map((p) => [p.id, p]));
  const sectionOrder = new Map(sections.map((s, i) => [s.id, i]));

  const rows = entries
    .filter((entry) => entry.matched)
    .sort(
      (a, b) =>
        (sectionOrder.get(a.sectionId) ?? 0) - (sectionOrder.get(b.sectionId) ?? 0) ||
        a.periodId - b.periodId ||
        (a.dayIds[0] ?? 0) - (b.dayIds[0] ?? 0),
    );

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-line bg-panel p-12 text-center">
        <p className="text-sm font-medium">No lectures match these filters</p>
        <p className="mt-1.5 text-sm text-fg-muted">Try clearing one of the filters above.</p>
      </div>
    );
  }

  return (
    <div className="fade-in overflow-hidden rounded-xl border border-line bg-panel">
      <div className="scrollbar-thin overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead>
            <tr className="bg-bg-subtle text-[11px] uppercase tracking-wider text-fg-faint">
              <th scope="col" className="border-b border-line px-4 py-2.5 text-left font-medium">
                Section
              </th>
              <th scope="col" className="border-b border-line px-4 py-2.5 text-left font-medium">
                Period
              </th>
              <th scope="col" className="border-b border-line px-4 py-2.5 text-left font-medium">
                Days
              </th>
              <th scope="col" className="border-b border-line px-4 py-2.5 text-left font-medium">
                Subject
              </th>
              <th scope="col" className="border-b border-line px-4 py-2.5 text-left font-medium">
                Teacher
              </th>
              <th scope="col" className="border-b border-line px-4 py-2.5 text-right font-medium">
                Lectures
              </th>
            </tr>
          </thead>

          <tbody>
            {rows.map((entry) => {
              const section = sectionById.get(entry.sectionId);
              const period = periodById.get(entry.periodId);

              return (
                <tr key={entry.id} className="border-b border-line last:border-b-0 hover:bg-panel-hover">
                  <td className="px-4 py-2.5">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-line-strong bg-bg-subtle text-xs font-semibold">
                      {section?.name ?? entry.sectionId}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs tabular-nums text-fg-muted">
                    {period?.label ?? entry.periodId}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="font-mono text-xs tabular-nums">
                      {formatDayRange(entry.dayIds)}
                    </span>
                    <span className="ml-2 text-xs text-fg-faint">
                      {dayNames(entry.dayIds, days)}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {entry.assignments.map((assignment, index) => {
                        const tone = swatch(assignment.subject.color);
                        return (
                          <span
                            key={`${entry.id}-s-${index}`}
                            className={`inline-flex items-center gap-1.5 rounded-md border px-1.5 py-0.5 text-xs font-medium ${tone.bg} ${tone.border} ${tone.text}`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
                            {assignment.subject.code}
                          </span>
                        );
                      })}
                    </div>
                    {entry.note ? (
                      <span className="mt-1 block text-[11px] text-fg-faint">{entry.note}</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-2.5 text-fg-muted">
                    {entry.assignments.map((a) => a.teacher?.name ?? "Unassigned").join(" / ")}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs tabular-nums">
                    {entry.lectures}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
