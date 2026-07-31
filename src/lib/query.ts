import "server-only";

import { colorForKey, isColorToken } from "./colors";
import {
  getClasses,
  getDays,
  getEntries,
  getSchool,
  getSections,
  getSubjects,
  getTeachers,
} from "./db";
import type {
  ClassRecord,
  Entry,
  FilterOptions,
  Filters,
  IntegrityIssue,
  ResolvedEntry,
  ResolvedSection,
  Stats,
  Subject,
  TeacherAvailabilityRow,
  Teacher,
  TeacherLoadRow,
  TimetableResponse,
} from "./types";

export const EMPTY_FILTERS: Filters = {
  teacher: [],
  subject: [],
  section: [],
  day: [],
  period: [],
  group: [],
  q: "",
};

function listParam(value: string | string[] | undefined | null): string[] {
  if (!value) return [];
  const raw = Array.isArray(value) ? value : [value];
  return raw
    .flatMap((item) => item.split(","))
    .map((item) => item.trim())
    .filter(Boolean);
}

type ParamSource =
  | URLSearchParams
  | Record<string, string | string[] | undefined>;

export function parseFilters(input: ParamSource): Filters {
  const get = (key: string) =>
    input instanceof URLSearchParams ? input.getAll(key) : input[key];

  return {
    teacher: listParam(get("teacher")),
    subject: listParam(get("subject")),
    section: listParam(get("section")),
    group: listParam(get("group")),
    day: listParam(get("day"))
      .map(Number)
      .filter(Number.isFinite),
    period: listParam(get("period"))
      .map(Number)
      .filter(Number.isFinite),
    q: (listParam(get("q"))[0] ?? "").trim().toLowerCase(),
  };
}

export function parseClassId(input: ParamSource): string | null {
  const get = (key: string) =>
    input instanceof URLSearchParams ? input.getAll(key) : input[key];
  return listParam(get("class"))[0] ?? null;
}

export function hasActiveFilters(filters: Filters): boolean {
  return (
    filters.teacher.length > 0 ||
    filters.subject.length > 0 ||
    filters.section.length > 0 ||
    filters.group.length > 0 ||
    filters.day.length > 0 ||
    filters.period.length > 0 ||
    filters.q.length > 0
  );
}

function humanizeId(id: string): string {
  return id
    .replace(/^(sub|tch|sec|ent)_/, "")
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function normalizeSubject(subject: Subject): Subject {
  return {
    ...subject,
    color: isColorToken(subject.color) ? subject.color : colorForKey(subject.id),
  };
}

function placeholderSubject(id: string): Subject {
  return {
    id,
    code: humanizeId(id),
    name: humanizeId(id),
    group: "other",
    color: colorForKey(id),
  };
}

function placeholderTeacher(id: string): Teacher {
  return {
    id,
    name: humanizeId(id),
    shortName: humanizeId(id),
    department: null,
    active: true,
  };
}

function entryMatches(
  entry: Entry,
  filters: Filters,
  subjectById: Map<string, Subject>,
): boolean {
  if (filters.section.length && !filters.section.includes(entry.sectionId)) return false;
  if (filters.period.length && !filters.period.includes(entry.periodId)) return false;
  if (filters.day.length && !entry.dayIds.some((d) => filters.day.includes(d))) return false;
  if (
    filters.teacher.length &&
    !entry.assignments.some((a) => a.teacherId && filters.teacher.includes(a.teacherId))
  ) {
    return false;
  }
  if (
    filters.subject.length &&
    !entry.assignments.some((a) => filters.subject.includes(a.subjectId))
  ) {
    return false;
  }
  if (
    filters.group.length &&
    !entry.assignments.some((a) =>
      filters.group.includes(subjectById.get(a.subjectId)?.group ?? "other"),
    )
  ) {
    return false;
  }
  return true;
}

function textMatches(
  entry: ResolvedEntry,
  sectionName: string,
  query: string,
): boolean {
  if (!query) return true;
  const haystack = [
    sectionName,
    String(entry.periodId),
    entry.note ?? "",
    ...entry.assignments.flatMap((a) => [
      a.subject.code,
      a.subject.name,
      a.subject.group,
      a.teacher?.name ?? "",
    ]),
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

function buildTeacherLoad(
  entries: ResolvedEntry[],
  filters: Filters,
): TeacherLoadRow[] {
  const rows = new Map<string, TeacherLoadRow>();

  for (const entry of entries) {
    if (!entry.matched) continue;
    const days = filters.day.length
      ? entry.dayIds.filter((d) => filters.day.includes(d))
      : entry.dayIds;

    for (const assignment of entry.assignments) {
      const teacher = assignment.teacher;
      if (!teacher) continue;
      if (filters.teacher.length && !filters.teacher.includes(teacher.id)) continue;
      if (filters.subject.length && !filters.subject.includes(assignment.subject.id)) continue;

      let row = rows.get(teacher.id);
      if (!row) {
        row = {
          teacherId: teacher.id,
          teacher: teacher.name,
          lectures: 0,
          slots: 0,
          subjects: [],
          sections: [],
          byDay: {},
        };
        rows.set(teacher.id, row);
      }

      row.lectures += days.length;
      row.slots += 1;
      if (!row.subjects.some((s) => s.id === assignment.subject.id)) {
        row.subjects.push({
          id: assignment.subject.id,
          code: assignment.subject.code,
          color: assignment.subject.color,
        });
      }
      if (!row.sections.includes(entry.sectionId)) row.sections.push(entry.sectionId);
      for (const day of days) row.byDay[day] = (row.byDay[day] ?? 0) + 1;
    }
  }

  return [...rows.values()].sort(
    (a, b) => b.lectures - a.lectures || a.teacher.localeCompare(b.teacher),
  );
}

function buildTeacherAvailability(
  allEntries: ResolvedEntry[],
  days: TimetableResponse["days"],
  periodsPerDay: number,
  onlyTeacherIds: string[],
): TeacherAvailabilityRow[] {
  const busy = new Map<string, { name: string; byDay: Map<number, Set<number>> }>();

  for (const entry of allEntries) {
    for (const assignment of entry.assignments) {
      const teacher = assignment.teacher;
      if (!teacher) continue;

      let record = busy.get(teacher.id);
      if (!record) {
        record = { name: teacher.name, byDay: new Map() };
        busy.set(teacher.id, record);
      }
      for (const dayId of entry.dayIds) {
        const slots = record.byDay.get(dayId) ?? new Set<number>();
        slots.add(entry.periodId);
        record.byDay.set(dayId, slots);
      }
    }
  }

  const wanted = new Set(onlyTeacherIds);

  return [...busy.entries()]
    .filter(([teacherId]) => wanted.size === 0 || wanted.has(teacherId))
    .map(([teacherId, record]) => {
      const perDay = days.map((day) => {
        const used = record.byDay.get(day.id)?.size ?? 0;
        return {
          dayId: day.id,
          busy: used,
          free: Math.max(0, periodsPerDay - used),
        };
      });

      return {
        teacherId,
        teacher: record.name,
        perDay,
        totalBusy: perDay.reduce((sum, day) => sum + day.busy, 0),
        totalFree: perDay.reduce((sum, day) => sum + day.free, 0),
      };
    })
    .sort((a, b) => b.totalBusy - a.totalBusy || a.teacher.localeCompare(b.teacher));
}

function buildFilterOptions(
  entries: ResolvedEntry[],
  classSubjects: Subject[],
  sections: { id: string; name: string }[],
  days: TimetableResponse["days"],
  periods: TimetableResponse["periods"],
): FilterOptions {
  const teacherStats = new Map<string, { id: string; name: string; lectures: number }>();
  const subjectStats = new Map<string, number>();

  for (const entry of entries) {
    for (const assignment of entry.assignments) {
      subjectStats.set(
        assignment.subject.id,
        (subjectStats.get(assignment.subject.id) ?? 0) + entry.dayIds.length,
      );
      const teacher = assignment.teacher;
      if (!teacher) continue;
      const current = teacherStats.get(teacher.id) ?? {
        id: teacher.id,
        name: teacher.name,
        lectures: 0,
      };
      current.lectures += entry.dayIds.length;
      teacherStats.set(teacher.id, current);
    }
  }

  return {
    teachers: [...teacherStats.values()].sort((a, b) => a.name.localeCompare(b.name)),
    subjects: classSubjects
      .map((subject) => ({
        id: subject.id,
        code: subject.code,
        name: subject.name,
        color: subject.color,
        lectures: subjectStats.get(subject.id) ?? 0,
      }))
      .sort((a, b) => b.lectures - a.lectures || a.code.localeCompare(b.code)),
    sections,
    days,
    periods,
    groups: [...new Set(classSubjects.map((s) => s.group))].sort(),
  };
}

export async function getTimetable(
  requestedClassId: string | null,
  filters: Filters,
): Promise<TimetableResponse> {
  const [school, days, allSubjects, allTeachers, classes] = await Promise.all([
    getSchool(),
    getDays(),
    getSubjects(),
    getTeachers(),
    getClasses(),
  ]);

  const currentClass: ClassRecord =
    classes.find((c) => c.id === requestedClassId) ??
    classes.find((c) => c.active) ??
    classes[0];

  if (!currentClass) {
    throw new Error("No classes are defined in data/classes.json");
  }

  const [sections, rawEntries] = await Promise.all([
    getSections(currentClass.id),
    getEntries(currentClass.id),
  ]);

  const subjectById = new Map(allSubjects.map((s) => [s.id, normalizeSubject(s)]));
  const teacherById = new Map(allTeachers.map((t) => [t.id, t]));
  const sectionById = new Map(sections.map((s) => [s.id, s]));
  const issues: IntegrityIssue[] = [];

  const usedSubjectIds = new Set<string>();
  const usedTeacherIds = new Set<string>();

  for (const entry of rawEntries) {
    if (!sectionById.has(entry.sectionId)) {
      issues.push({
        level: "error",
        entity: "entry",
        id: entry.id,
        message: `Unknown sectionId "${entry.sectionId}"`,
      });
    }
    if (!currentClass.periods.some((p) => p.id === entry.periodId)) {
      issues.push({
        level: "error",
        entity: "entry",
        id: entry.id,
        message: `Period ${entry.periodId} is not defined for class ${currentClass.id}`,
      });
    }
    for (const assignment of entry.assignments) {
      usedSubjectIds.add(assignment.subjectId);
      if (!subjectById.has(assignment.subjectId)) {
        subjectById.set(assignment.subjectId, placeholderSubject(assignment.subjectId));
        issues.push({
          level: "warning",
          entity: "entry",
          id: entry.id,
          message: `Unknown subjectId "${assignment.subjectId}", rendered as a placeholder`,
        });
      }
      if (assignment.teacherId) {
        usedTeacherIds.add(assignment.teacherId);
        if (!teacherById.has(assignment.teacherId)) {
          teacherById.set(assignment.teacherId, placeholderTeacher(assignment.teacherId));
          issues.push({
            level: "warning",
            entity: "entry",
            id: entry.id,
            message: `Unknown teacherId "${assignment.teacherId}", rendered as a placeholder`,
          });
        }
      } else {
        issues.push({
          level: "warning",
          entity: "entry",
          id: entry.id,
          message: `Assignment for "${assignment.subjectId}" has no teacher`,
        });
      }
    }
  }

  for (const section of sections) {
    for (const subjectId of section.electiveSubjectIds) {
      usedSubjectIds.add(subjectId);
      if (!subjectById.has(subjectId)) {
        subjectById.set(subjectId, placeholderSubject(subjectId));
        issues.push({
          level: "warning",
          entity: "section",
          id: section.id,
          message: `Elective subjectId "${subjectId}" is not in subjects.json`,
        });
      }
    }
  }

  const resolvedSections: ResolvedSection[] = sections.map((section) => ({
    id: section.id,
    classId: section.classId,
    name: section.name,
    order: section.order,
    note: section.note,
    electives: section.electiveSubjectIds.map(
      (subjectId) => subjectById.get(subjectId) ?? placeholderSubject(subjectId),
    ),
  }));

  const classSubjectIds = new Set<string>([...currentClass.subjectIds, ...usedSubjectIds]);
  const classSubjects = [...classSubjectIds]
    .map((id) => subjectById.get(id) ?? placeholderSubject(id))
    .sort((a, b) => a.group.localeCompare(b.group) || a.code.localeCompare(b.code));

  const classTeachers = [...usedTeacherIds]
    .map((id) => teacherById.get(id) ?? placeholderTeacher(id))
    .sort((a, b) => a.name.localeCompare(b.name));

  const resolved: ResolvedEntry[] = rawEntries.map((entry) => {
    const assignments = entry.assignments.map((assignment) => ({
      subject: subjectById.get(assignment.subjectId) ?? placeholderSubject(assignment.subjectId),
      teacher: assignment.teacherId
        ? (teacherById.get(assignment.teacherId) ?? placeholderTeacher(assignment.teacherId))
        : null,
    }));

    const base: ResolvedEntry = {
      id: entry.id,
      classId: entry.classId,
      sectionId: entry.sectionId,
      periodId: entry.periodId,
      dayIds: [...entry.dayIds].sort((a, b) => a - b),
      note: entry.note,
      assignments,
      matched: false,
      lectures: 0,
    };

    const structuralMatch = entryMatches(entry, filters, subjectById);
    const sectionName = sectionById.get(entry.sectionId)?.name ?? entry.sectionId;
    const matched = structuralMatch && textMatches(base, sectionName, filters.q);

    base.matched = matched;
    base.lectures = matched
      ? filters.day.length
        ? base.dayIds.filter((d) => filters.day.includes(d)).length
        : base.dayIds.length
      : 0;

    return base;
  });

  const matched = resolved.filter((e) => e.matched);
  const matchedTeachers = new Set<string>();
  const matchedSubjects = new Set<string>();
  for (const entry of matched) {
    for (const assignment of entry.assignments) {
      if (assignment.teacher) matchedTeachers.add(assignment.teacher.id);
      matchedSubjects.add(assignment.subject.id);
    }
  }

  const occupied = new Set(resolved.map((e) => `${e.sectionId}:${e.periodId}`));
  const stats: Stats = {
    totalEntries: resolved.length,
    matchedEntries: matched.length,
    matchedLectures: matched.reduce((sum, e) => sum + e.lectures, 0),
    totalLectures: resolved.reduce((sum, e) => sum + e.dayIds.length, 0),
    matchedTeachers: matchedTeachers.size,
    matchedSubjects: matchedSubjects.size,
    freeSlots: Math.max(
      0,
      sections.length * currentClass.periods.length - occupied.size,
    ),
  };

  return {
    school,
    classId: currentClass.id,
    classes: classes.map((c) => ({
      id: c.id,
      name: c.name,
      shortName: c.shortName,
      active: c.active,
      entryCount: c.id === currentClass.id ? rawEntries.length : -1,
    })),
    currentClass,
    days,
    periods: [...currentClass.periods].sort((a, b) => a.id - b.id),
    sections: resolvedSections,
    subjects: classSubjects,
    teachers: classTeachers,
    entries: resolved,
    stats,
    teacherLoad: buildTeacherLoad(resolved, filters),
    teacherAvailability: buildTeacherAvailability(
      resolved,
      days,
      currentClass.periods.length,
      filters.teacher,
    ),
    periodsPerDay: currentClass.periods.length,
    filters,
    filterOptions: buildFilterOptions(
      resolved,
      classSubjects,
      sections.map((s) => ({ id: s.id, name: s.name })),
      days,
      [...currentClass.periods].sort((a, b) => a.id - b.id),
    ),
    issues,
  };
}
