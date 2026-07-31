import { swatch } from "@/lib/colors";
import type { FilterOptions, Stats, Subject } from "@/lib/types";

export function StatCards({
  stats,
  filtersActive,
}: {
  stats: Stats;
  filtersActive: boolean;
}) {
  const cards = [
    {
      label: filtersActive ? "Matching lectures" : "Lectures / week",
      value: stats.matchedLectures,
      hint: filtersActive ? `of ${stats.totalLectures}` : "across all sections",
    },
    {
      label: filtersActive ? "Matching slots" : "Timetable slots",
      value: stats.matchedEntries,
      hint: filtersActive ? `of ${stats.totalEntries}` : "distinct blocks",
    },
    { label: "Teachers", value: stats.matchedTeachers, hint: "involved" },
    { label: "Subjects", value: stats.matchedSubjects, hint: "involved" },
    { label: "Free slots", value: stats.freeSlots, hint: "section x period" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-xl border border-line bg-panel p-4 transition-colors hover:border-line-strong"
        >
          <p className="text-[11px] font-medium uppercase tracking-wider text-fg-faint">
            {card.label}
          </p>
          <p className="mt-2 font-mono text-2xl font-semibold tabular-nums leading-none">
            {card.value}
          </p>
          <p className="mt-1.5 text-xs text-fg-muted">{card.hint}</p>
        </div>
      ))}
    </div>
  );
}

export function Legend({
  subjects,
  options,
}: {
  subjects: Subject[];
  options: FilterOptions;
}) {
  const lectureById = new Map(options.subjects.map((s) => [s.id, s.lectures]));
  const groups = [...new Set(subjects.map((s) => s.group))].sort();

  return (
    <div className="rounded-xl border border-line bg-panel p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-medium">Subjects in this class</h2>
        <span className="font-mono text-xs text-fg-faint">{subjects.length}</span>
      </div>

      <div className="mt-3 space-y-3">
        {groups.map((group) => (
          <div key={group}>
            <p className="text-[10px] font-medium uppercase tracking-wider text-fg-faint">
              {group}
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {subjects
                .filter((subject) => subject.group === group)
                .map((subject) => {
                  const tone = swatch(subject.color);
                  const lectures = lectureById.get(subject.id) ?? 0;
                  return (
                    <span
                      key={subject.id}
                      title={`${subject.name} · ${lectures} lectures/week`}
                      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs ${tone.bg} ${tone.border}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
                      <span className={`font-medium ${tone.text}`}>{subject.code}</span>
                      <span className="text-fg-faint">{subject.name}</span>
                      <span className="font-mono text-[10px] text-fg-faint">{lectures}</span>
                    </span>
                  );
                })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DayLegend({ days }: { days: { id: number; name: string }[] }) {
  return (
    <div className="rounded-xl border border-line bg-panel p-4">
      <h2 className="text-sm font-medium">Day codes</h2>
      <p className="mt-1 text-xs text-fg-muted">
        Numbers inside each cell are weekday codes, so <code className="font-mono">1-6</code> means
        every working day.
      </p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {days.map((day) => (
          <span
            key={day.id}
            className="inline-flex items-center gap-1.5 rounded-md border border-line px-2 py-1 text-xs"
          >
            <span className="font-mono font-semibold">{day.id}</span>
            <span className="text-fg-muted">{day.name}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
