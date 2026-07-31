import {
  applyFilters,
  buildFilterOptions,
  classParamSchema,
  filtersSchema,
  resolveDataset,
  type ClassRecord,
  type Filters,
  type RawDataset,
  type ResolvedDataset,
  type TimetableResponse,
} from "@kaksha/core";

import {
  getClasses,
  getDays,
  getEntries,
  getSchool,
  getSections,
  getSubjects,
  getTeachers,
} from "./db/queries.js";

export type ParamSource = Record<string, string | string[] | undefined>;

export function parseFilters(input: ParamSource): Filters {
  return filtersSchema.parse({
    teacher: input.teacher,
    subject: input.subject,
    section: input.section,
    group: input.group,
    day: input.day,
    period: input.period,
    q: input.q,
  });
}

export function parseClassId(input: ParamSource): string | null {
  return classParamSchema.parse(input.class ?? null);
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
    classes.find((record) => record.id === requestedClassId) ??
    classes.find((record) => record.active) ??
    classes[0];

  if (!currentClass) {
    throw new Error("No classes are defined. Run the seed script first.");
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
    classes: classes.map((record) => ({
      id: record.id,
      name: record.name,
      shortName: record.shortName,
      active: record.active,
      entryCount: record.id === currentClass.id ? entries.length : -1,
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
