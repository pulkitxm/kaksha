import { swatch } from "./colors.js";
import type { ResolvedDataset, ResolvedEntry, Filters } from "./types.js";

export type ShareCell = {
  sectionName: string;
  subjectCode: string;
  color: string;
  deepColor: string;
  teacherName: string;
};

export type ShareRow = {
  periodId: number;
  periodLabel: string;
  periodName: string | null;
  byDay: Record<number, ShareCell[]>;
};

export type ShareModel = {
  title: string;
  subtitle: string;
  lectures: number;
  slots: number;
  days: { id: number; short: string }[];
  rows: ShareRow[];
  footnote: string;
};

export function buildShareModel(
  dataset: ResolvedDataset,
  entries: ResolvedEntry[],
  filters: Filters,
  teacherId: string | null,
): ShareModel {
  const matched = entries.filter((entry) => entry.matched);
  const sectionNameById = new Map(dataset.sections.map((s) => [s.id, s.name]));
  const teacherName = teacherId
    ? (dataset.teachers.find((teacher) => teacher.id === teacherId)?.name ?? null)
    : null;

  const activeDays = filters.day.length
    ? dataset.days.filter((day) => filters.day.includes(day.id))
    : dataset.days;

  const rowMap = new Map<number, ShareRow>();
  let lectures = 0;

  for (const entry of matched) {
    const period = dataset.periods.find((item) => item.id === entry.periodId);
    let row = rowMap.get(entry.periodId);

    if (!row) {
      row = {
        periodId: entry.periodId,
        periodLabel: period?.label ?? String(entry.periodId),
        periodName: period?.name && period.name !== period.label ? period.name : null,
        byDay: {},
      };
      rowMap.set(entry.periodId, row);
    }

    const relevant = teacherId
      ? entry.assignments.filter((item) => item.teacher?.id === teacherId)
      : entry.assignments;
    const shown = relevant.length > 0 ? relevant : entry.assignments;

    for (const dayId of entry.dayIds) {
      if (!activeDays.some((day) => day.id === dayId)) continue;
      const bucket = row.byDay[dayId] ?? [];
      row.byDay[dayId] = bucket;

      for (const assignment of shown) {
        const tone = swatch(assignment.subject.color);
        bucket.push({
          sectionName: sectionNameById.get(entry.sectionId) ?? entry.sectionId,
          subjectCode: assignment.subject.code,
          color: tone.base,
          deepColor: tone.deep,
          teacherName: assignment.teacher?.name ?? "Unassigned",
        });
        lectures += 1;
      }
    }
  }

  const rows = [...rowMap.values()].sort((a, b) => a.periodId - b.periodId);

  return {
    title: teacherName ?? dataset.currentClass.name,
    subtitle: `${dataset.currentClass.name} · ${dataset.school.session}`,
    lectures: teacherName ? lectures : matched.reduce((sum, e) => sum + e.lectures, 0),
    slots: matched.length,
    days: activeDays.map((day) => ({ id: day.id, short: day.short })),
    rows,
    footnote: teacherName ? "" : dataset.school.title,
  };
}
