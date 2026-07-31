import { randomUUID } from "node:crypto";

import {
  createEntrySchema,
  createSectionSchema,
  labelForIndex,
  mergeSectionsSchema,
  planMerge,
  reassignSchema,
  relabelSections,
  renameSectionSchema,
  reorderSectionsSchema,
  updateEntrySchema,
  updateSectionElectivesSchema,
} from "@kaksha/core";
import { and, eq, inArray } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";

import { getDb, schema } from "../db/client.js";
import { asHandler, HttpError } from "../http.js";

export const mutationRouter: Router = Router();

const idParam = z.object({ id: z.string().min(1).max(120) });

function parse<T>(parser: z.ZodType<T>, value: unknown, label: string): T {
  const result = parser.safeParse(value);
  if (!result.success) {
    throw new HttpError(400, `Invalid ${label}`, z.treeifyError(result.error));
  }
  return result.data;
}

async function replaceEntryChildren(
  tx: Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0],
  entryId: string,
  dayIds: number[] | undefined,
  assignments: { subjectId: string; teacherId: string | null }[] | undefined,
): Promise<void> {
  if (dayIds) {
    await tx.delete(schema.entryDays).where(eq(schema.entryDays.entryId, entryId));
    await tx.insert(schema.entryDays).values(dayIds.map((dayId) => ({ entryId, dayId })));
  }

  if (assignments) {
    await tx
      .delete(schema.entryAssignments)
      .where(eq(schema.entryAssignments.entryId, entryId));
    await tx.insert(schema.entryAssignments).values(
      assignments.map((assignment, position) => ({
        entryId,
        position,
        subjectId: assignment.subjectId,
        teacherId: assignment.teacherId,
      })),
    );
  }
}

mutationRouter.post(
  "/entries",
  asHandler(async (request, response) => {
    const input = parse(createEntrySchema, request.body, "entry");
    const id = `ent_${input.classId}_${randomUUID().slice(0, 8)}`;

    await getDb().transaction(async (tx) => {
      await tx.insert(schema.entries).values({
        id,
        classId: input.classId,
        sectionId: input.sectionId,
        periodId: input.periodId,
        note: input.note,
      });
      await replaceEntryChildren(tx, id, input.dayIds, input.assignments);
    });

    response.status(201).json({ id });
  }),
);

mutationRouter.patch(
  "/entries/:id",
  asHandler(async (request, response) => {
    const { id } = parse(idParam, request.params, "path parameters");
    const input = parse(updateEntrySchema, request.body, "entry update");

    await getDb().transaction(async (tx) => {
      const existing = await tx.query.entries.findFirst({
        where: (table, { eq: equals }) => equals(table.id, id),
      });
      if (!existing) throw new HttpError(404, `Unknown entry ${id}`);

      const patch: Partial<typeof schema.entries.$inferInsert> = {};
      if (input.sectionId !== undefined) patch.sectionId = input.sectionId;
      if (input.periodId !== undefined) patch.periodId = input.periodId;
      if (input.note !== undefined) patch.note = input.note;

      if (Object.keys(patch).length > 0) {
        await tx.update(schema.entries).set(patch).where(eq(schema.entries.id, id));
      }

      await replaceEntryChildren(tx, id, input.dayIds, input.assignments);
    });

    response.json({ id });
  }),
);

mutationRouter.delete(
  "/entries/:id",
  asHandler(async (request, response) => {
    const { id } = parse(idParam, request.params, "path parameters");
    const deleted = await getDb()
      .delete(schema.entries)
      .where(eq(schema.entries.id, id))
      .returning({ id: schema.entries.id });

    if (deleted.length === 0) throw new HttpError(404, `Unknown entry ${id}`);
    response.json({ id });
  }),
);

mutationRouter.post(
  "/entries/reassign",
  asHandler(async (request, response) => {
    const input = parse(reassignSchema, request.body, "reassignment");

    const affected = await getDb().transaction(async (tx) => {
      const entries = await tx.query.entries.findMany({
        where: (table, { eq: equals }) => equals(table.classId, input.classId),
        with: { days: true, assignments: true },
      });

      const targets = entries.filter((entry) => {
        if (input.sectionIds.length && !input.sectionIds.includes(entry.sectionId)) {
          return false;
        }
        if (input.periodIds.length && !input.periodIds.includes(entry.periodId)) {
          return false;
        }
        if (
          input.dayIds.length &&
          !entry.days.some((day) => input.dayIds.includes(day.dayId))
        ) {
          return false;
        }
        return entry.assignments.some(
          (assignment) =>
            (input.fromTeacherId === undefined ||
              assignment.teacherId === input.fromTeacherId) &&
            (input.fromSubjectId === undefined ||
              assignment.subjectId === input.fromSubjectId),
        );
      });

      let count = 0;
      for (const entry of targets) {
        for (const assignment of entry.assignments) {
          const teacherMatches =
            input.fromTeacherId === undefined ||
            assignment.teacherId === input.fromTeacherId;
          const subjectMatches =
            input.fromSubjectId === undefined ||
            assignment.subjectId === input.fromSubjectId;
          if (!teacherMatches || !subjectMatches) continue;

          const patch: Partial<typeof schema.entryAssignments.$inferInsert> = {};
          if (input.toTeacherId !== undefined) patch.teacherId = input.toTeacherId;
          if (input.toSubjectId !== undefined) patch.subjectId = input.toSubjectId;
          if (Object.keys(patch).length === 0) continue;

          await tx
            .update(schema.entryAssignments)
            .set(patch)
            .where(
              and(
                eq(schema.entryAssignments.entryId, entry.id),
                eq(schema.entryAssignments.position, assignment.position),
              ),
            );
          count += 1;
        }
      }
      return count;
    });

    response.json({ updated: affected });
  }),
);

mutationRouter.post(
  "/sections",
  asHandler(async (request, response) => {
    const input = parse(createSectionSchema, request.body, "section");
    const id = `sec_${input.classId}_${randomUUID().slice(0, 8)}`;

    await getDb().transaction(async (tx) => {
      const siblings = await tx.query.sections.findMany({
        where: (table, { eq: equals }) => equals(table.classId, input.classId),
      });

      await tx.insert(schema.sections).values({
        id,
        classId: input.classId,
        name: input.name,
        order: siblings.length,
        note: input.note,
      });

      if (input.electiveSubjectIds.length > 0) {
        await tx.insert(schema.sectionElectives).values(
          input.electiveSubjectIds.map((subjectId, position) => ({
            sectionId: id,
            subjectId,
            position,
          })),
        );
      }
    });

    response.status(201).json({ id });
  }),
);

mutationRouter.patch(
  "/sections/:id",
  asHandler(async (request, response) => {
    const { id } = parse(idParam, request.params, "path parameters");
    const input = parse(renameSectionSchema, request.body, "section rename");

    const updated = await getDb()
      .update(schema.sections)
      .set({ name: input.name })
      .where(eq(schema.sections.id, id))
      .returning({ id: schema.sections.id });

    if (updated.length === 0) throw new HttpError(404, `Unknown section ${id}`);
    response.json({ id, name: input.name });
  }),
);

mutationRouter.put(
  "/sections/:id/electives",
  asHandler(async (request, response) => {
    const { id } = parse(idParam, request.params, "path parameters");
    const input = parse(updateSectionElectivesSchema, request.body, "electives");

    await getDb().transaction(async (tx) => {
      const section = await tx.query.sections.findFirst({
        where: (table, { eq: equals }) => equals(table.id, id),
      });
      if (!section) throw new HttpError(404, `Unknown section ${id}`);

      await tx
        .delete(schema.sectionElectives)
        .where(eq(schema.sectionElectives.sectionId, id));

      if (input.electiveSubjectIds.length > 0) {
        await tx.insert(schema.sectionElectives).values(
          input.electiveSubjectIds.map((subjectId, position) => ({
            sectionId: id,
            subjectId,
            position,
          })),
        );
      }
    });

    response.json({ id, electiveSubjectIds: input.electiveSubjectIds });
  }),
);

mutationRouter.delete(
  "/sections/:id",
  asHandler(async (request, response) => {
    const { id } = parse(idParam, request.params, "path parameters");

    const result = await getDb().transaction(async (tx) => {
      const section = await tx.query.sections.findFirst({
        where: (table, { eq: equals }) => equals(table.id, id),
      });
      if (!section) throw new HttpError(404, `Unknown section ${id}`);

      await tx.delete(schema.sections).where(eq(schema.sections.id, id));

      const remaining = await tx.query.sections.findMany({
        where: (table, { eq: equals }) => equals(table.classId, section.classId),
      });

      const plan = relabelSections(remaining);
      for (const change of plan) {
        await tx
          .update(schema.sections)
          .set({ order: change.order, name: change.name })
          .where(eq(schema.sections.id, change.id));
      }
      return plan;
    });

    response.json({ removed: id, sections: result });
  }),
);

mutationRouter.post(
  "/sections/merge",
  asHandler(async (request, response) => {
    const input = parse(mergeSectionsSchema, request.body, "merge");

    const result = await getDb().transaction(async (tx) => {
      const sections = await tx.query.sections.findMany({
        where: (table, { eq: equals }) => equals(table.classId, input.classId),
      });

      const plan = planMerge(sections, input.sourceId, input.targetId);

      await tx
        .update(schema.entries)
        .set({ sectionId: input.targetId })
        .where(eq(schema.entries.sectionId, input.sourceId));

      const targetElectives = await tx.query.sectionElectives.findMany({
        where: (table, { eq: equals }) => equals(table.sectionId, input.targetId),
      });
      const sourceElectives = await tx.query.sectionElectives.findMany({
        where: (table, { eq: equals }) => equals(table.sectionId, input.sourceId),
      });

      const merged = [...targetElectives.map((row) => row.subjectId)];
      for (const row of sourceElectives) {
        if (!merged.includes(row.subjectId)) merged.push(row.subjectId);
      }

      await tx
        .delete(schema.sectionElectives)
        .where(eq(schema.sectionElectives.sectionId, input.targetId));
      if (merged.length > 0) {
        await tx.insert(schema.sectionElectives).values(
          merged.map((subjectId, position) => ({
            sectionId: input.targetId,
            subjectId,
            position,
          })),
        );
      }

      await tx.delete(schema.sections).where(eq(schema.sections.id, input.sourceId));

      if (input.relabel) {
        for (const change of plan.keep) {
          await tx
            .update(schema.sections)
            .set({ order: change.order, name: change.name })
            .where(eq(schema.sections.id, change.id));
        }
      }

      return plan;
    });

    response.json({ removed: result.removed, sections: result.keep });
  }),
);

mutationRouter.post(
  "/sections/reorder",
  asHandler(async (request, response) => {
    const input = parse(reorderSectionsSchema, request.body, "reorder");

    const result = await getDb().transaction(async (tx) => {
      const sections = await tx.query.sections.findMany({
        where: (table, { eq: equals }) => equals(table.classId, input.classId),
      });

      const known = new Set(sections.map((section) => section.id));
      for (const id of input.orderedIds) {
        if (!known.has(id)) throw new HttpError(400, `Unknown section ${id}`);
      }

      const ordered = input.orderedIds.map((id, index) => ({
        id,
        order: index,
        name: input.relabel
          ? labelForIndex(index)
          : (sections.find((section) => section.id === id)?.name ?? labelForIndex(index)),
      }));

      for (const change of ordered) {
        await tx
          .update(schema.sections)
          .set({ order: change.order, name: change.name })
          .where(eq(schema.sections.id, change.id));
      }

      return ordered;
    });

    response.json({ sections: result });
  }),
);

mutationRouter.delete(
  "/classes/:id/entries",
  asHandler(async (request, response) => {
    const { id } = parse(idParam, request.params, "path parameters");
    const sections = await getDb().query.sections.findMany({
      where: (table, { eq: equals }) => equals(table.classId, id),
    });

    if (sections.length === 0) throw new HttpError(404, `Unknown class ${id}`);

    const deleted = await getDb()
      .delete(schema.entries)
      .where(
        inArray(
          schema.entries.sectionId,
          sections.map((section) => section.id),
        ),
      )
      .returning({ id: schema.entries.id });

    response.json({ deleted: deleted.length });
  }),
);
