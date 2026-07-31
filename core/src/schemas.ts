import { z } from "zod";

import { COLOR_TOKENS } from "./colors.js";

export const colorTokenSchema = z.enum(COLOR_TOKENS);

const id = (prefix: string) =>
  z
    .string()
    .min(1)
    .max(120)
    .regex(
      new RegExp(`^${prefix}_[a-z0-9][a-z0-9._-]*$`),
      `must look like ${prefix}_slug`,
    );

export const subjectIdSchema = id("sub");
export const teacherIdSchema = id("tch");
export const sectionIdSchema = id("sec");
export const entryIdSchema = id("ent");
export const classIdSchema = z
  .string()
  .min(1)
  .max(32)
  .regex(/^[A-Za-z0-9_-]+$/, "class id must be url safe");

export const dayIdSchema = z.int().min(1).max(7);
export const periodIdSchema = z.int().min(0).max(20);

export const schoolSchema = z.object({
  name: z.string().default(""),
  title: z.string().min(1),
  session: z.string().default(""),
  updatedAt: z.string().default(""),
});

export const daySchema = z.object({
  id: dayIdSchema,
  name: z.string().min(1),
  short: z.string().min(1).max(8),
  order: z.int().min(0),
});

export const periodSchema = z.object({
  id: periodIdSchema,
  name: z.string().min(1),
  label: z.string().min(1).max(8),
});

export const subjectSchema = z.object({
  id: subjectIdSchema,
  code: z.string().min(1).max(40),
  name: z.string().min(1).max(80),
  group: z.string().min(1).max(40),
  color: colorTokenSchema,
});

export const teacherSchema = z.object({
  id: teacherIdSchema,
  name: z.string().min(1).max(80),
  shortName: z.string().min(1).max(80),
  department: z.string().max(80).nullable().default(null),
  active: z.boolean().default(true),
});

export const classSchema = z.object({
  id: classIdSchema,
  name: z.string().min(1).max(60),
  shortName: z.string().min(1).max(20),
  order: z.int().min(0),
  active: z.boolean().default(false),
  periods: z.array(periodSchema).min(1),
  subjectIds: z.array(subjectIdSchema).default([]),
});

export const sectionSchema = z.object({
  id: sectionIdSchema,
  classId: classIdSchema,
  name: z.string().min(1).max(20),
  order: z.int().min(0),
  electiveSubjectIds: z.array(subjectIdSchema).default([]),
  note: z.string().max(200).nullable().default(null),
});

export const assignmentSchema = z.object({
  subjectId: subjectIdSchema,
  teacherId: teacherIdSchema.nullable(),
});

export const entrySchema = z.object({
  id: entryIdSchema,
  classId: classIdSchema,
  sectionId: sectionIdSchema,
  periodId: periodIdSchema,
  dayIds: z.array(dayIdSchema).min(1),
  assignments: z.array(assignmentSchema).min(1),
  note: z.string().max(200).nullable().default(null),
});

export const seedFileSchemas = {
  school: schoolSchema,
  days: z.array(daySchema).min(1),
  subjects: z.array(subjectSchema),
  teachers: z.array(teacherSchema),
  classes: z.array(classSchema).min(1),
  sections: z.array(sectionSchema),
  entries: z.array(entrySchema),
} as const;

const csv = z.union([z.string(), z.array(z.string())]).transform((value) =>
  (Array.isArray(value) ? value : [value])
    .flatMap((item) => item.split(","))
    .map((item) => item.trim())
    .filter(Boolean),
);

const csvOf = (inner: z.ZodType<string, string>) =>
  csv
    .transform((values) => values.filter((value) => inner.safeParse(value).success))
    .catch([]);

const numericCsvOf = (inner: z.ZodType<number, number>) =>
  csv
    .transform((values) =>
      values
        .map(Number)
        .filter((value) => Number.isInteger(value) && inner.safeParse(value).success),
    )
    .catch([]);

export const filtersSchema = z.object({
  teacher: csvOf(teacherIdSchema).default([]),
  subject: csvOf(subjectIdSchema).default([]),
  section: csvOf(sectionIdSchema).default([]),
  group: csv.catch([]).default([]),
  day: numericCsvOf(dayIdSchema).default([]),
  period: numericCsvOf(periodIdSchema).default([]),
  q: z
    .union([z.string(), z.array(z.string())])
    .transform((value) => (Array.isArray(value) ? (value[0] ?? "") : value))
    .transform((value) => value.trim().toLowerCase().slice(0, 100))
    .catch("")
    .default(""),
});

export const classParamSchema = z
  .union([z.string(), z.array(z.string())])
  .transform((value) => (Array.isArray(value) ? (value[0] ?? null) : value))
  .transform((value) => (value ? value.trim() : null))
  .pipe(classIdSchema.nullable())
  .catch(null);

export const themeParamSchema = z
  .union([z.literal("light"), z.literal("dark")])
  .catch("dark");

export type SchoolInput = z.infer<typeof schoolSchema>;
export type DayInput = z.infer<typeof daySchema>;
export type SubjectInput = z.infer<typeof subjectSchema>;
export type TeacherInput = z.infer<typeof teacherSchema>;
export type ClassInput = z.infer<typeof classSchema>;
export type SectionInput = z.infer<typeof sectionSchema>;
export type EntryInput = z.infer<typeof entrySchema>;
export type FiltersInput = z.infer<typeof filtersSchema>;
