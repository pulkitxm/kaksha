import "server-only";

import { asc } from "drizzle-orm";
import { cache } from "react";
import { z } from "zod";

import { db, schema } from "@/db/client";

import {
  classIdSchema,
  classSchema,
  daySchema,
  entrySchema,
  schoolSchema,
  sectionSchema,
  subjectSchema,
  teacherSchema,
} from "./schemas";
import type {
  ClassRecord,
  Day,
  Entry,
  School,
  Section,
  Subject,
  Teacher,
} from "./types";

function parseRows<T>(label: string, parser: z.ZodType<T>, value: unknown): T {
  const result = parser.safeParse(value);

  if (!result.success) {
    const detail = result.error.issues
      .slice(0, 5)
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("; ");
    throw new Error(`Database row validation failed for ${label}: ${detail}`);
  }

  return result.data;
}

export const getSchool = cache(async (): Promise<School> => {
  const [row] = await db.select().from(schema.school).limit(1);

  if (!row) {
    return { name: "", title: "Kaksha", session: "", updatedAt: "" };
  }

  return parseRows("school", schoolSchema, {
    name: row.name,
    title: row.title,
    session: row.session,
    updatedAt: row.updatedAt?.toISOString().slice(0, 10) ?? "",
  });
});

export const getDays = cache(async (): Promise<Day[]> => {
  const rows = await db.select().from(schema.days).orderBy(asc(schema.days.order));
  return parseRows("days", z.array(daySchema), rows);
});

export const getSubjects = cache(async (): Promise<Subject[]> => {
  const rows = await db.select().from(schema.subjects).orderBy(asc(schema.subjects.code));
  return parseRows("subjects", z.array(subjectSchema), rows);
});

export const getTeachers = cache(async (): Promise<Teacher[]> => {
  const rows = await db.select().from(schema.teachers).orderBy(asc(schema.teachers.name));
  return parseRows("teachers", z.array(teacherSchema), rows);
});

export const getClasses = cache(async (): Promise<ClassRecord[]> => {
  const rows = await db.query.classes.findMany({
    with: { periods: true, classSubjects: true },
    orderBy: (table, { asc: ascending }) => [ascending(table.order), ascending(table.id)],
  });

  const shaped = rows.map((row) => ({
    id: row.id,
    name: row.name,
    shortName: row.shortName,
    order: row.order,
    active: row.active,
    periods: [...row.periods]
      .sort((a, b) => a.periodId - b.periodId)
      .map((period) => ({
        id: period.periodId,
        name: period.name,
        label: period.label,
      })),
    subjectIds: row.classSubjects.map((link) => link.subjectId),
  }));

  return parseRows("classes", z.array(classSchema), shaped);
});

export const getSections = cache(async (classId: string): Promise<Section[]> => {
  if (!classIdSchema.safeParse(classId).success) return [];

  const rows = await db.query.sections.findMany({
    where: (table, { eq }) => eq(table.classId, classId),
    with: { electives: true },
    orderBy: (table, { asc: ascending }) => [ascending(table.order), ascending(table.name)],
  });

  const shaped = rows.map((row) => ({
    id: row.id,
    classId: row.classId,
    name: row.name,
    order: row.order,
    note: row.note,
    electiveSubjectIds: [...row.electives]
      .sort((a, b) => a.position - b.position)
      .map((elective) => elective.subjectId),
  }));

  return parseRows("sections", z.array(sectionSchema), shaped);
});

export const getEntries = cache(async (classId: string): Promise<Entry[]> => {
  if (!classIdSchema.safeParse(classId).success) return [];

  const rows = await db.query.entries.findMany({
    where: (table, { eq }) => eq(table.classId, classId),
    with: { days: true, assignments: true },
    orderBy: (table, { asc: ascending }) => [
      ascending(table.sectionId),
      ascending(table.periodId),
      ascending(table.id),
    ],
  });

  const shaped = rows
    .filter((row) => row.assignments.length > 0 && row.days.length > 0)
    .map((row) => ({
      id: row.id,
      classId: row.classId,
      sectionId: row.sectionId,
      periodId: row.periodId,
      note: row.note,
      dayIds: row.days.map((day) => day.dayId).sort((a, b) => a - b),
      assignments: [...row.assignments]
        .sort((a, b) => a.position - b.position)
        .map((assignment) => ({
          subjectId: assignment.subjectId,
          teacherId: assignment.teacherId,
        })),
    }));

  return parseRows("entries", z.array(entrySchema), shaped);
});
