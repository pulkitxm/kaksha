import type { TimetableResponse } from "./types";

export const SHARE_PALETTE: Record<string, string> = {
  blue: "#3b82f6",
  orange: "#f97316",
  violet: "#8b5cf6",
  emerald: "#10b981",
  amber: "#f59e0b",
  rose: "#f43f5e",
  teal: "#14b8a6",
  cyan: "#06b6d4",
  lime: "#84cc16",
  fuchsia: "#d946ef",
  sky: "#0ea5e9",
  slate: "#64748b",
};

export function shareColor(token: string): string {
  return SHARE_PALETTE[token] ?? SHARE_PALETTE.slate;
}

export type ShareCell = {
  sectionName: string;
  subjectCode: string;
  color: string;
  teacherName: string;
};

export type ShareModel = {
  title: string;
  subtitle: string;
  lectures: number;
  slots: number;
  mode: "teacher" | "general";
  days: { id: number; short: string }[];
  rows: {
    periodId: number;
    periodLabel: string;
    periodName: string | null;
    byDay: Record<number, ShareCell[]>;
  }[];
  footnote: string;
};

function describeFilters(data: TimetableResponse): string {
  const parts: string[] = [];
  const { filters, filterOptions } = data;

  if (filters.teacher.length) {
    parts.push(
      filters.teacher
        .map((id) => filterOptions.teachers.find((t) => t.id === id)?.name ?? id)
        .join(", "),
    );
  }
  if (filters.subject.length) {
    parts.push(
      filters.subject
        .map((id) => filterOptions.subjects.find((s) => s.id === id)?.code ?? id)
        .join(", "),
    );
  }
  if (filters.section.length) {
    parts.push(
      `Section ${filters.section
        .map((id) => filterOptions.sections.find((s) => s.id === id)?.name ?? id)
        .join(", ")}`,
    );
  }
  if (filters.day.length) {
    parts.push(
      filters.day
        .map((id) => filterOptions.days.find((d) => d.id === id)?.name ?? `Day ${id}`)
        .join(", "),
    );
  }
  if (filters.period.length) {
    parts.push(`Period ${filters.period.join(", ")}`);
  }
  if (filters.group.length) parts.push(filters.group.join(", "));
  if (filters.q) parts.push(`"${filters.q}"`);

  return parts.join(" · ");
}

export function buildShareModel(data: TimetableResponse): ShareModel {
  const matched = data.entries.filter((entry) => entry.matched);
  const sectionById = new Map(data.sections.map((s) => [s.id, s.name]));

  const singleTeacherId =
    data.filters.teacher.length === 1 ? data.filters.teacher[0] : null;
  const teacherName = singleTeacherId
    ? (data.filterOptions.teachers.find((t) => t.id === singleTeacherId)?.name ??
      singleTeacherId)
    : null;

  const description = describeFilters(data);
  const activeDays = data.filters.day.length
    ? data.days.filter((d) => data.filters.day.includes(d.id))
    : data.days;

  const rowMap = new Map<number, ShareModel["rows"][number]>();

  for (const entry of matched) {
    const period = data.periods.find((p) => p.id === entry.periodId);
    let row = rowMap.get(entry.periodId);
    if (!row) {
      row = {
        periodId: entry.periodId,
        periodLabel: period?.label ?? String(entry.periodId),
        periodName:
          period?.name && period.name !== period.label ? period.name : null,
        byDay: {},
      };
      rowMap.set(entry.periodId, row);
    }

    const relevant = entry.assignments.filter((assignment) =>
      singleTeacherId ? assignment.teacher?.id === singleTeacherId : true,
    );
    const shown = relevant.length > 0 ? relevant : entry.assignments;

    for (const dayId of entry.dayIds) {
      if (!activeDays.some((d) => d.id === dayId)) continue;
      const bucket = row.byDay[dayId] ?? (row.byDay[dayId] = []);
      for (const assignment of shown) {
        bucket.push({
          sectionName: sectionById.get(entry.sectionId) ?? entry.sectionId,
          subjectCode: assignment.subject.code,
          color: shareColor(assignment.subject.color),
          teacherName: assignment.teacher?.name ?? "Unassigned",
        });
      }
    }
  }

  const rows = [...rowMap.values()].sort((a, b) => a.periodId - b.periodId);

  return {
    title: teacherName ?? description ?? data.currentClass.name,
    subtitle: teacherName
      ? `${data.currentClass.name} · ${data.school.session}`
      : `${data.currentClass.name} · ${data.school.session}`,
    lectures: data.stats.matchedLectures,
    slots: data.stats.matchedEntries,
    mode: teacherName ? "teacher" : "general",
    days: activeDays.map((d) => ({ id: d.id, short: d.short })),
    rows,
    footnote: teacherName && description !== teacherName ? description : "",
  };
}
