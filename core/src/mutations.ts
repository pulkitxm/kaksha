import { z } from "zod";

import {
  assignmentSchema,
  classIdSchema,
  colorTokenSchema,
  dayIdSchema,
  periodIdSchema,
  periodSchema,
  sectionIdSchema,
  subjectIdSchema,
  teacherIdSchema,
} from "./schemas.js";

export const createEntrySchema = z.object({
  classId: classIdSchema,
  sectionId: sectionIdSchema,
  periodId: periodIdSchema,
  dayIds: z.array(dayIdSchema).min(1).max(7),
  assignments: z.array(assignmentSchema).min(1).max(6),
  note: z.string().max(200).nullable().default(null),
});

export const updateEntrySchema = z
  .object({
    sectionId: sectionIdSchema.optional(),
    periodId: periodIdSchema.optional(),
    dayIds: z.array(dayIdSchema).min(1).max(7).optional(),
    assignments: z.array(assignmentSchema).min(1).max(6).optional(),
    note: z.string().max(200).nullable().optional(),
  })
  .refine(
    (value) => Object.keys(value).length > 0,
    "At least one field must be provided",
  );

export const reassignSchema = z
  .object({
    fromTeacherId: teacherIdSchema.optional(),
    toTeacherId: teacherIdSchema.nullable().optional(),
    fromSubjectId: subjectIdSchema.optional(),
    toSubjectId: subjectIdSchema.optional(),
    classId: classIdSchema,
    sectionIds: z.array(sectionIdSchema).default([]),
    periodIds: z.array(periodIdSchema).default([]),
    dayIds: z.array(dayIdSchema).default([]),
  })
  .refine(
    (value) => value.fromTeacherId !== undefined || value.fromSubjectId !== undefined,
    "Provide fromTeacherId or fromSubjectId",
  )
  .refine(
    (value) => value.toTeacherId !== undefined || value.toSubjectId !== undefined,
    "Provide toTeacherId or toSubjectId",
  );

export const renameSectionSchema = z.object({
  name: z.string().min(1).max(20),
});

export const mergeSectionsSchema = z.object({
  classId: classIdSchema,
  sourceId: sectionIdSchema,
  targetId: sectionIdSchema,
  relabel: z.boolean().default(true),
});

export const reorderSectionsSchema = z.object({
  classId: classIdSchema,
  orderedIds: z.array(sectionIdSchema).min(1),
  relabel: z.boolean().default(true),
});

export const createSectionSchema = z.object({
  classId: classIdSchema,
  name: z.string().min(1).max(20),
  electiveSubjectIds: z.array(subjectIdSchema).default([]),
  note: z.string().max(200).nullable().default(null),
});

export const updateSectionElectivesSchema = z.object({
  electiveSubjectIds: z.array(subjectIdSchema).max(12),
});

export const swapEntriesSchema = z.object({
  firstId: z.string().min(1),
  secondId: z.string().min(1),
});

const atLeastOneField = (value: object) => Object.keys(value).length > 0;

const atLeastOne = "At least one field must be provided";

export const createTeacherSchema = z.object({
  name: z.string().min(1).max(80),
  shortName: z.string().min(1).max(80),
  department: z.string().max(80).nullable().default(null),
  active: z.boolean().default(true),
});

export const updateTeacherSchema = z
  .object({
    name: z.string().min(1).max(80).optional(),
    shortName: z.string().min(1).max(80).optional(),
    department: z.string().max(80).nullable().optional(),
    active: z.boolean().optional(),
  })
  .refine(atLeastOneField, atLeastOne);

export const createSubjectSchema = z.object({
  code: z.string().min(1).max(40),
  name: z.string().min(1).max(80),
  group: z.string().min(1).max(40),
  color: colorTokenSchema,
  classIds: z.array(classIdSchema).default([]),
});

export const updateSubjectSchema = z
  .object({
    code: z.string().min(1).max(40).optional(),
    name: z.string().min(1).max(80).optional(),
    group: z.string().min(1).max(40).optional(),
    color: colorTokenSchema.optional(),
  })
  .refine(atLeastOneField, atLeastOne);

export const createClassSchema = z.object({
  id: classIdSchema,
  name: z.string().min(1).max(60),
  shortName: z.string().min(1).max(20),
  active: z.boolean().default(false),
  periods: z.array(periodSchema).min(1).max(21),
  subjectIds: z.array(subjectIdSchema).default([]),
});

export const updateClassSchema = z
  .object({
    name: z.string().min(1).max(60).optional(),
    shortName: z.string().min(1).max(20).optional(),
    active: z.boolean().optional(),
    periods: z.array(periodSchema).min(1).max(21).optional(),
  })
  .refine(atLeastOneField, atLeastOne);

export const updateClassSubjectsSchema = z.object({
  subjectIds: z.array(subjectIdSchema).max(60),
});

export const createNoteSchema = z.object({
  classId: classIdSchema.nullable().default(null),
  title: z.string().min(1).max(120),
  html: z.string().max(200000).default(""),
  preview: z.string().max(400).default(""),
  pinned: z.boolean().default(false),
});

export const updateNoteSchema = z
  .object({
    classId: classIdSchema.nullable().optional(),
    title: z.string().min(1).max(120).optional(),
    html: z.string().max(200000).optional(),
    preview: z.string().max(400).optional(),
    pinned: z.boolean().optional(),
  })
  .refine(atLeastOneField, atLeastOne);

export type CreateEntryInput = z.infer<typeof createEntrySchema>;
export type UpdateEntryInput = z.infer<typeof updateEntrySchema>;
export type ReassignInput = z.infer<typeof reassignSchema>;
export type MergeSectionsInput = z.infer<typeof mergeSectionsSchema>;
export type ReorderSectionsInput = z.infer<typeof reorderSectionsSchema>;
export type CreateSectionInput = z.infer<typeof createSectionSchema>;
export type CreateTeacherInput = z.infer<typeof createTeacherSchema>;
export type UpdateTeacherInput = z.infer<typeof updateTeacherSchema>;
export type CreateSubjectInput = z.infer<typeof createSubjectSchema>;
export type UpdateSubjectInput = z.infer<typeof updateSubjectSchema>;
export type CreateClassInput = z.infer<typeof createClassSchema>;
export type UpdateClassInput = z.infer<typeof updateClassSchema>;
export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;
