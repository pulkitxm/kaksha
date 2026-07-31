import { swatch } from "@/lib/colors";
import type { Day, ResolvedSection, TeacherLoadRow } from "@/lib/types";

type Props = {
  rows: TeacherLoadRow[];
  days: Day[];
  sections: ResolvedSection[];
};

export function TeacherLoadTable({ rows, days, sections }: Props) {
  const sectionById = new Map(sections.map((s) => [s.id, s.name]));
  const max = rows.reduce((peak, row) => Math.max(peak, row.lectures), 0) || 1;

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-line bg-panel p-12 text-center">
        <p className="text-sm font-medium">No teachers match these filters</p>
        <p className="mt-1.5 text-sm text-fg-muted">Try clearing one of the filters above.</p>
      </div>
    );
  }

  return (
    <div className="fade-in overflow-hidden rounded-xl border border-line bg-panel">
      <div className="scrollbar-thin overflow-x-auto">
        <table className="w-full min-w-[860px] border-collapse text-sm">
          <thead>
            <tr className="bg-bg-subtle text-[11px] uppercase tracking-wider text-fg-faint">
              <th scope="col" className="border-b border-line px-4 py-2.5 text-left font-medium">
                Teacher
              </th>
              <th scope="col" className="border-b border-line px-4 py-2.5 text-left font-medium">
                Weekly load
              </th>
              <th scope="col" className="border-b border-line px-4 py-2.5 text-left font-medium">
                Subjects
              </th>
              <th scope="col" className="border-b border-line px-4 py-2.5 text-left font-medium">
                Sections
              </th>
              <th scope="col" className="border-b border-line px-4 py-2.5 text-left font-medium">
                Per day
              </th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => (
              <tr
                key={row.teacherId}
                className="border-b border-line last:border-b-0 hover:bg-panel-hover"
              >
                <td className="px-4 py-3">
                  <span className="font-medium">{row.teacher}</span>
                  <span className="mt-0.5 block font-mono text-[10px] text-fg-faint">
                    {row.teacherId}
                  </span>
                </td>

                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-8 shrink-0 font-mono text-sm tabular-nums">
                      {row.lectures}
                    </span>
                    <span className="h-1.5 w-32 overflow-hidden rounded-full bg-bg-subtle">
                      <span
                        className="block h-full rounded-full bg-fg"
                        style={{ width: `${Math.round((row.lectures / max) * 100)}%` }}
                      />
                    </span>
                    <span className="text-xs text-fg-faint">{row.slots} slots</span>
                  </div>
                </td>

                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {row.subjects.map((subject) => {
                      const tone = swatch(subject.color);
                      return (
                        <span
                          key={subject.id}
                          className={`rounded-md border px-1.5 py-0.5 text-[11px] font-medium ${tone.bg} ${tone.border} ${tone.text}`}
                        >
                          {subject.code}
                        </span>
                      );
                    })}
                  </div>
                </td>

                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {row.sections.map((id) => (
                      <span
                        key={id}
                        className="inline-flex h-5 w-5 items-center justify-center rounded border border-line text-[11px] font-medium text-fg-muted"
                      >
                        {sectionById.get(id) ?? id}
                      </span>
                    ))}
                  </div>
                </td>

                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    {days.map((day) => {
                      const count = row.byDay[day.id] ?? 0;
                      return (
                        <span
                          key={day.id}
                          title={`${day.name}: ${count}`}
                          className={`flex h-6 w-6 items-center justify-center rounded font-mono text-[11px] tabular-nums ${
                            count === 0
                              ? "bg-bg-subtle text-fg-faint/40"
                              : "bg-fg/10 text-fg"
                          }`}
                        >
                          {count || ""}
                        </span>
                      );
                    })}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
