import { asc, desc } from "drizzle-orm";
import { z } from "zod";
import {
  classIdSchema,
  classSchema,
  daySchema,
  entrySchema,
  noteSchema,
  schoolSchema,
  sectionSchema,
  subjectSchema,
  teacherSchema,
  type ClassRecord,
  type Day,
  type Entry,
  type Note,
  type School,
  type Section,
  type Subject,
  type Teacher,
} from "@kaksha/core";

import { getDb, schema } from "./client.js";

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

export async function getSchool(): Promise<School> {
  const rows = await getDb().select().from(schema.school).limit(1);
  const row = rows[0];

  if (!row) return { name: "", title: "Kaksha", session: "", updatedAt: "" };

  return parseRows("school", schoolSchema, {
    name: row.name,
    title: row.title,
    session: row.session,
    updatedAt: row.updatedAt.toISOString().slice(0, 10),
  });
}

export async function getDays(): Promise<Day[]> {
  const rows = await getDb().select().from(schema.days).orderBy(asc(schema.days.order));
  return parseRows("days", z.array(daySchema), rows);
}

export function toNote(row: typeof schema.notes.$inferSelect): Note {
  return noteSchema.parse({
    id: row.id,
    classId: row.classId,
    title: row.title,
    html: row.html,
    preview: row.preview,
    pinned: row.pinned,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });
}

export async function getNotes(): Promise<Note[]> {
  const rows = await getDb()
    .select()
    .from(schema.notes)
    .orderBy(desc(schema.notes.pinned), desc(schema.notes.updatedAt));
  return rows.map(toNote);
}

export async function getSubjects(): Promise<Subject[]> {
  const rows = await getDb()
    .select()
    .from(schema.subjects)
    .orderBy(asc(schema.subjects.code));
  return parseRows("subjects", z.array(subjectSchema), rows);
}

export async function getTeachers(): Promise<Teacher[]> {
  const rows = await getDb()
    .select()
    .from(schema.teachers)
    .orderBy(asc(schema.teachers.name));
  return parseRows("teachers", z.array(teacherSchema), rows);
}

export async function getClasses(): Promise<ClassRecord[]> {
  const rows = await getDb().query.classes.findMany({
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
      .map((period) => ({ id: period.periodId, name: period.name, label: period.label })),
    subjectIds: row.classSubjects.map((link) => link.subjectId),
  }));

  return parseRows("classes", z.array(classSchema), shaped);
}

export async function getSections(classId: string | null): Promise<Section[]> {
  if (classId !== null && !classIdSchema.safeParse(classId).success) return [];

  const rows = await getDb().query.sections.findMany({
    where: (table, { eq }) => (classId === null ? undefined : eq(table.classId, classId)),
    with: { electives: true },
    orderBy: (table, { asc: ascending }) => [
      ascending(table.classId),
      ascending(table.order),
      ascending(table.name),
    ],
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
}

export async function getEntries(classId: string | null): Promise<Entry[]> {
  if (classId !== null && !classIdSchema.safeParse(classId).success) return [];

  const rows = await getDb().query.entries.findMany({
    where: (table, { eq }) => (classId === null ? undefined : eq(table.classId, classId)),
    with: { days: true, assignments: true },
    orderBy: (table, { asc: ascending }) => [
      ascending(table.classId),
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
}
