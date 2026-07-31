import { swatch } from "@/lib/colors";
import { formatDayRange, isFullWeek } from "@/lib/format";
import type { Day, Period, ResolvedEntry, Section } from "@/lib/types";

type Props = {
  sections: Section[];
  periods: Period[];
  days: Day[];
  entries: ResolvedEntry[];
  filtersActive: boolean;
};

function EntryBlock({
  entry,
  days,
  compact,
  dimmed,
}: {
  entry: ResolvedEntry;
  days: Day[];
  compact: boolean;
  dimmed: boolean;
}) {
  const primary = entry.assignments[0];
  const tone = swatch(primary?.subject.color ?? "slate");
  const fullWeek = isFullWeek(entry.dayIds, days);
  const range = formatDayRange(entry.dayIds);

  return (
    <div
      className={`rounded-md border px-1.5 py-1 transition-opacity ${tone.bg} ${tone.border} ${
        dimmed ? "opacity-25 grayscale" : ""
      }`}
      title={`Days ${range} · ${entry.assignments
        .map((a) => `${a.subject.name}${a.teacher ? ` (${a.teacher.name})` : ""}`)
        .join(" / ")}`}
    >
      <div className={compact ? "flex flex-wrap items-baseline gap-x-1.5" : ""}>
        <span
          className={`font-mono text-[10px] tabular-nums ${
            fullWeek ? "text-fg-faint" : `${tone.text} font-semibold`
          }`}
        >
          {range}
        </span>

        <div className={compact ? "flex flex-wrap items-baseline gap-x-1.5" : "mt-0.5"}>
          {entry.assignments.map((assignment, index) => (
            <span key={`${entry.id}-${assignment.subject.id}-${index}`} className="contents">
              {index > 0 ? <span className="text-fg-faint">/</span> : null}
              <span className={`text-[13px] font-medium leading-snug ${tone.text}`}>
                {assignment.subject.code}
              </span>
            </span>
          ))}
        </div>
      </div>

      <div
        className={`text-[11px] leading-snug text-balance break-words text-fg-muted ${
          compact ? "" : "mt-0.5"
        }`}
      >
        {entry.assignments.map((a) => a.teacher?.name ?? "Unassigned").join(" / ")}
      </div>
    </div>
  );
}

export function TimetableGrid({
  sections,
  periods,
  days,
  entries,
  filtersActive,
}: Props) {
  const byCell = new Map<string, ResolvedEntry[]>();
  for (const entry of entries) {
    const key = `${entry.sectionId}:${entry.periodId}`;
    const bucket = byCell.get(key);
    if (bucket) bucket.push(entry);
    else byCell.set(key, [entry]);
  }
  for (const bucket of byCell.values()) {
    bucket.sort((a, b) => (a.dayIds[0] ?? 0) - (b.dayIds[0] ?? 0));
  }

  if (sections.length === 0 || periods.length === 0) {
    return (
      <div className="rounded-xl border border-line bg-panel p-12 text-center">
        <p className="text-sm font-medium">No timetable data for this class yet</p>
        <p className="mt-1.5 text-sm text-fg-muted">
          Add sections to <code className="font-mono text-xs">data/sections.json</code> and
          entries to <code className="font-mono text-xs">data/entries/&lt;classId&gt;.json</code>.
        </p>
      </div>
    );
  }

  return (
    <div className="fade-in overflow-hidden rounded-xl border border-line bg-panel">
      <div className="scrollbar-thin overflow-x-auto">
        <table className="w-full min-w-[1400px] table-fixed border-collapse">
          <colgroup>
            <col className="w-[112px]" />
            {periods.map((period) => (
              <col key={period.id} />
            ))}
          </colgroup>
          <thead>
            <tr className="bg-bg-subtle">
              <th
                scope="col"
                className="sticky left-0 z-20 border-b border-r border-line bg-bg-subtle px-3 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-fg-faint"
              >
                Section
              </th>
              {periods.map((period) => (
                <th
                  key={period.id}
                  scope="col"
                  className="border-b border-r border-line px-2 py-2.5 text-center text-sm font-semibold last:border-r-0"
                >
                  <span className="font-mono tabular-nums">{period.label}</span>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {sections.map((section) => (
              <tr key={section.id} className="group">
                <th
                  scope="row"
                  className="sticky left-0 z-10 border-b border-r border-line bg-panel px-3 py-2 text-left align-top"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-line-strong bg-bg-subtle text-sm font-semibold">
                    {section.name}
                  </span>
                  {section.electives.length > 0 ? (
                    <span className="mt-1.5 block text-[10px] leading-relaxed text-fg-faint">
                      {section.electives.join(" · ")}
                    </span>
                  ) : null}
                  {section.note ? (
                    <span className="mt-1 inline-block rounded border border-line px-1 py-px font-mono text-[9px] uppercase tracking-wide text-fg-faint">
                      {section.note}
                    </span>
                  ) : null}
                </th>

                {periods.map((period) => {
                  const cell = byCell.get(`${section.id}:${period.id}`) ?? [];
                  const compact = cell.length > 2;

                  return (
                    <td
                      key={period.id}
                      className="border-b border-r border-line p-1.5 align-top last:border-r-0"
                    >
                      {cell.length === 0 ? (
                        <span className="block py-3 text-center text-xs text-fg-faint/50">-</span>
                      ) : (
                        <div className="space-y-1">
                          {cell.map((entry) => (
                            <EntryBlock
                              key={entry.id}
                              entry={entry}
                              days={days}
                              compact={compact}
                              dimmed={filtersActive && !entry.matched}
                            />
                          ))}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
