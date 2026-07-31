import { swatch } from "./colors.js";
import type {
  Day,
  Filters,
  Period,
  ResolvedAssignment,
  ResolvedDataset,
  ResolvedEntry,
} from "./types.js";

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

function pickDays(days: Day[], filters: Filters): Day[] {
  return filters.day.length ? days.filter((day) => filters.day.includes(day.id)) : days;
}

function ensureRow(
  rowMap: Map<number, ShareRow>,
  periodId: number,
  periods: Period[],
): ShareRow {
  const existing = rowMap.get(periodId);
  if (existing) return existing;
  const period = periods.find((item) => item.id === periodId);
  const row: ShareRow = {
    periodId,
    periodLabel: period?.label ?? String(periodId),
    periodName: period?.name && period.name !== period.label ? period.name : null,
    byDay: {},
  };
  rowMap.set(periodId, row);
  return row;
}

function toCell(sectionName: string, assignment: ResolvedAssignment): ShareCell {
  const tone = swatch(assignment.subject.color);
  return {
    sectionName,
    subjectCode: assignment.subject.code,
    color: tone.base,
    deepColor: tone.deep,
    teacherName: assignment.teacher?.name ?? "Unassigned",
  };
}

function sortedRows(rowMap: Map<number, ShareRow>): ShareRow[] {
  return [...rowMap.values()].sort((a, b) => a.periodId - b.periodId);
}

export function buildShareModel(
  dataset: ResolvedDataset,
  entries: ResolvedEntry[],
  filters: Filters,
): ShareModel {
  const matched = entries.filter((entry) => entry.matched);
  const sectionNameById = new Map(dataset.sections.map((s) => [s.id, s.name]));
  const activeDays = pickDays(dataset.days, filters);
  const rowMap = new Map<number, ShareRow>();

  for (const entry of matched) {
    const row = ensureRow(rowMap, entry.periodId, dataset.periods);

    for (const dayId of entry.dayIds) {
      if (!activeDays.some((day) => day.id === dayId)) continue;
      const bucket = row.byDay[dayId] ?? [];
      row.byDay[dayId] = bucket;

      for (const assignment of entry.assignments) {
        bucket.push(
          toCell(sectionNameById.get(entry.sectionId) ?? entry.sectionId, assignment),
        );
      }
    }
  }

  return {
    title: dataset.currentClass.name,
    subtitle: `${dataset.currentClass.name} · ${dataset.school.session}`,
    lectures: matched.reduce((sum, entry) => sum + entry.lectures, 0),
    slots: matched.length,
    days: activeDays.map((day) => ({ id: day.id, short: day.short })),
    rows: sortedRows(rowMap),
    footnote: dataset.school.title,
  };
}

export function buildTeacherShareModel(
  datasets: ResolvedDataset[],
  teacherId: string,
  filters: Filters,
): ShareModel {
  const first = datasets[0];
  if (!first) {
    return {
      title: "Timetable",
      subtitle: "",
      lectures: 0,
      slots: 0,
      days: [],
      rows: [],
      footnote: "",
    };
  }

  const teacherName =
    datasets
      .flatMap((dataset) => dataset.teachers)
      .find((teacher) => teacher.id === teacherId)?.name ?? "Teacher";
  const activeDays = pickDays(first.days, filters);
  const rowMap = new Map<number, ShareRow>();
  const matchedClasses: ResolvedDataset["currentClass"][] = [];
  let lectures = 0;
  let slots = 0;

  for (const dataset of datasets) {
    const sectionNameById = new Map(dataset.sections.map((s) => [s.id, s.name]));
    let classMatched = false;

    for (const entry of dataset.entries) {
      const taught = entry.assignments.filter(
        (assignment) => assignment.teacher?.id === teacherId,
      );
      if (taught.length === 0) continue;

      classMatched = true;
      slots += 1;
      const row = ensureRow(rowMap, entry.periodId, dataset.periods);

      for (const dayId of entry.dayIds) {
        if (!activeDays.some((day) => day.id === dayId)) continue;
        const bucket = row.byDay[dayId] ?? [];
        row.byDay[dayId] = bucket;

        for (const assignment of taught) {
          const sectionName = sectionNameById.get(entry.sectionId) ?? entry.sectionId;
          bucket.push(
            toCell(`${dataset.currentClass.shortName}-${sectionName}`, assignment),
          );
          lectures += 1;
        }
      }
    }

    if (classMatched) matchedClasses.push(dataset.currentClass);
  }

  const soleClass = matchedClasses.length === 1 ? matchedClasses[0] : undefined;
  const subtitle = soleClass
    ? `${soleClass.name} · ${first.school.session}`
    : matchedClasses.length === 0
      ? `All classes · ${first.school.session}`
      : `Classes ${matchedClasses.map((cls) => cls.shortName).join(", ")} · ${first.school.session}`;

  return {
    title: teacherName,
    subtitle,
    lectures,
    slots,
    days: activeDays.map((day) => ({ id: day.id, short: day.short })),
    rows: sortedRows(rowMap),
    footnote: "",
  };
}
