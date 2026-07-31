import "server-only";

import {
  applyFilters,
  buildFilterOptions,
  EMPTY_FILTERS,
  hasActiveFilters,
  resolveDataset,
} from "./derive";
import {
  getClasses,
  getDays,
  getEntries,
  getSchool,
  getSections,
  getSubjects,
  getTeachers,
} from "./db";
import { classParamSchema, filtersSchema } from "./schemas";
import type {
  ClassRecord,
  Filters,
  RawDataset,
  ResolvedDataset,
  TimetableResponse,
} from "./types";

export { EMPTY_FILTERS, hasActiveFilters };

type ParamSource =
  | URLSearchParams
  | Record<string, string | string[] | undefined>;

function toRecord(input: ParamSource): Record<string, string | string[] | undefined> {
  if (!(input instanceof URLSearchParams)) return input;

  const record: Record<string, string[]> = {};
  for (const key of new Set(input.keys())) record[key] = input.getAll(key);
  return record;
}

export function parseFilters(input: ParamSource): Filters {
  const record = toRecord(input);
  return filtersSchema.parse({
    teacher: record.teacher,
    subject: record.subject,
    section: record.section,
    group: record.group,
    day: record.day,
    period: record.period,
    q: record.q,
  });
}

export function parseClassId(input: ParamSource): string | null {
  const value = toRecord(input).class;
  return classParamSchema.parse(value ?? null);
}

async function loadRawDataset(requestedClassId: string | null): Promise<RawDataset> {
  const [school, days, subjects, teachers, classes] = await Promise.all([
    getSchool(),
    getDays(),
    getSubjects(),
    getTeachers(),
    getClasses(),
  ]);

  const currentClass: ClassRecord | undefined =
    classes.find((c) => c.id === requestedClassId) ??
    classes.find((c) => c.active) ??
    classes[0];

  if (!currentClass) {
    throw new Error("No classes are defined. Run `npm run db:seed` first.");
  }

  const [sections, entries] = await Promise.all([
    getSections(currentClass.id),
    getEntries(currentClass.id),
  ]);

  return {
    school,
    currentClass,
    days,
    sections,
    subjects,
    teachers,
    entries,
    classes: classes.map((c) => ({
      id: c.id,
      name: c.name,
      shortName: c.shortName,
      active: c.active,
      entryCount: c.id === currentClass.id ? entries.length : -1,
    })),
  };
}

export async function getDataset(
  requestedClassId: string | null,
): Promise<ResolvedDataset> {
  return resolveDataset(await loadRawDataset(requestedClassId));
}

export async function getTimetable(
  requestedClassId: string | null,
  filters: Filters,
): Promise<TimetableResponse> {
  const dataset = await getDataset(requestedClassId);
  const derived = applyFilters(dataset, filters);

  return {
    school: dataset.school,
    classId: dataset.classId,
    classes: dataset.classes,
    currentClass: dataset.currentClass,
    days: dataset.days,
    periods: dataset.periods,
    sections: dataset.sections,
    subjects: dataset.subjects,
    teachers: dataset.teachers,
    entries: derived.entries,
    stats: derived.stats,
    teacherLoad: derived.teacherLoad,
    teacherAvailability: derived.teacherAvailability,
    periodsPerDay: dataset.periods.length,
    filters,
    filterOptions: buildFilterOptions(dataset),
    issues: dataset.issues,
  };
}
