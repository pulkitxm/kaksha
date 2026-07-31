import { z } from "zod";

import {
  assignmentSchema,
  classIdSchema,
  dayIdSchema,
  periodIdSchema,
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

export type CreateEntryInput = z.infer<typeof createEntrySchema>;
export type UpdateEntryInput = z.infer<typeof updateEntrySchema>;
export type ReassignInput = z.infer<typeof reassignSchema>;
export type MergeSectionsInput = z.infer<typeof mergeSectionsSchema>;
export type ReorderSectionsInput = z.infer<typeof reorderSectionsSchema>;
export type CreateSectionInput = z.infer<typeof createSectionSchema>;
