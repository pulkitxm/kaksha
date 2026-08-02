import { randomUUID } from "node:crypto";

import {
  createClassSchema,
  createSubjectSchema,
  createTeacherSchema,
  updateClassSchema,
  updateClassSubjectsSchema,
  updateSubjectSchema,
  updateTeacherSchema,
} from "@kaksha/core";
import { eq } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";

import { getDb, schema } from "../db/client.js";
import { asHandler, HttpError } from "../http.js";

export const recordRouter: Router = Router();

const idParam = z.object({ id: z.string().min(1).max(120) });

function parse<T>(parser: z.ZodType<T>, value: unknown, label: string): T {
  const result = parser.safeParse(value);
  if (!result.success) {
    throw new HttpError(400, `Invalid ${label}`, z.treeifyError(result.error));
  }
  return result.data;
}

function forced(value: unknown): boolean {
  return value === "1" || value === "true";
}

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return /^[a-z0-9]/.test(slug) ? slug.slice(0, 40) : `x${slug}`.slice(0, 40);
}

function uniqueId(prefix: string, source: string, taken: string[]): string {
  const candidate = `${prefix}_${slugify(source)}`;
  if (!taken.includes(candidate)) return candidate;
  return `${candidate}-${randomUUID().slice(0, 4)}`;
}

recordRouter.post(
  "/teachers",
  asHandler(async (request, response) => {
    const input = parse(createTeacherSchema, request.body, "teacher");
    const existing = await getDb()
      .select({ id: schema.teachers.id })
      .from(schema.teachers);
    const id = uniqueId(
      "tch",
      input.name,
      existing.map((row) => row.id),
    );

    await getDb().insert(schema.teachers).values({
      id,
      name: input.name,
      shortName: input.shortName,
      department: input.department,
      active: input.active,
    });

    response.status(201).json({ id });
  }),
);

recordRouter.patch(
  "/teachers/:id",
  asHandler(async (request, response) => {
    const { id } = parse(idParam, request.params, "path parameters");
    const input = parse(updateTeacherSchema, request.body, "teacher update");

    const updated = await getDb()
      .update(schema.teachers)
      .set(input)
      .where(eq(schema.teachers.id, id))
      .returning({ id: schema.teachers.id });

    if (updated.length === 0) throw new HttpError(404, `Unknown teacher ${id}`);
    response.json({ id });
  }),
);

recordRouter.delete(
  "/teachers/:id",
  asHandler(async (request, response) => {
    const { id } = parse(idParam, request.params, "path parameters");

    const lectures = await getDb().$count(
      schema.entryAssignments,
      eq(schema.entryAssignments.teacherId, id),
    );

    if (lectures > 0 && !forced(request.query.force)) {
      throw new HttpError(
        409,
        `${String(lectures)} lectures still point at this teacher`,
        { lectures },
      );
    }

    const deleted = await getDb()
      .delete(schema.teachers)
      .where(eq(schema.teachers.id, id))
      .returning({ id: schema.teachers.id });

    if (deleted.length === 0) throw new HttpError(404, `Unknown teacher ${id}`);
    response.json({ id, unassigned: lectures });
  }),
);

recordRouter.post(
  "/subjects",
  asHandler(async (request, response) => {
    const input = parse(createSubjectSchema, request.body, "subject");
    const existing = await getDb()
      .select({ id: schema.subjects.id })
      .from(schema.subjects);
    const id = uniqueId(
      "sub",
      input.code,
      existing.map((row) => row.id),
    );

    await getDb().transaction(async (tx) => {
      await tx.insert(schema.subjects).values({
        id,
        code: input.code,
        name: input.name,
        group: input.group,
        color: input.color,
      });

      if (input.classIds.length > 0) {
        await tx
          .insert(schema.classSubjects)
          .values(input.classIds.map((classId) => ({ classId, subjectId: id })));
      }
    });

    response.status(201).json({ id });
  }),
);

recordRouter.patch(
  "/subjects/:id",
  asHandler(async (request, response) => {
    const { id } = parse(idParam, request.params, "path parameters");
    const input = parse(updateSubjectSchema, request.body, "subject update");

    const updated = await getDb()
      .update(schema.subjects)
      .set(input)
      .where(eq(schema.subjects.id, id))
      .returning({ id: schema.subjects.id });

    if (updated.length === 0) throw new HttpError(404, `Unknown subject ${id}`);
    response.json({ id });
  }),
);

recordRouter.delete(
  "/subjects/:id",
  asHandler(async (request, response) => {
    const { id } = parse(idParam, request.params, "path parameters");

    const lectures = await getDb().$count(
      schema.entryAssignments,
      eq(schema.entryAssignments.subjectId, id),
    );

    if (lectures > 0) {
      throw new HttpError(409, `${String(lectures)} lectures still teach this subject`, {
        lectures,
      });
    }

    const deleted = await getDb()
      .delete(schema.subjects)
      .where(eq(schema.subjects.id, id))
      .returning({ id: schema.subjects.id });

    if (deleted.length === 0) throw new HttpError(404, `Unknown subject ${id}`);
    response.json({ id });
  }),
);

recordRouter.put(
  "/classes/:id/subjects",
  asHandler(async (request, response) => {
    const { id } = parse(idParam, request.params, "path parameters");
    const input = parse(updateClassSubjectsSchema, request.body, "class subjects");

    await getDb().transaction(async (tx) => {
      const record = await tx.query.classes.findFirst({
        where: (table, { eq: equals }) => equals(table.id, id),
      });
      if (!record) throw new HttpError(404, `Unknown class ${id}`);

      await tx.delete(schema.classSubjects).where(eq(schema.classSubjects.classId, id));

      if (input.subjectIds.length > 0) {
        await tx
          .insert(schema.classSubjects)
          .values(input.subjectIds.map((subjectId) => ({ classId: id, subjectId })));
      }
    });

    response.json({ id, subjectIds: input.subjectIds });
  }),
);

recordRouter.post(
  "/classes",
  asHandler(async (request, response) => {
    const input = parse(createClassSchema, request.body, "class");

    await getDb().transaction(async (tx) => {
      const clash = await tx.query.classes.findFirst({
        where: (table, { eq: equals }) => equals(table.id, input.id),
      });
      if (clash) throw new HttpError(409, `Class ${input.id} already exists`);

      const siblings = await tx.select({ id: schema.classes.id }).from(schema.classes);

      await tx.insert(schema.classes).values({
        id: input.id,
        name: input.name,
        shortName: input.shortName,
        order: siblings.length,
        active: input.active,
      });

      await tx.insert(schema.periods).values(
        input.periods.map((period) => ({
          classId: input.id,
          periodId: period.id,
          name: period.name,
          label: period.label,
        })),
      );

      if (input.subjectIds.length > 0) {
        await tx.insert(schema.classSubjects).values(
          input.subjectIds.map((subjectId) => ({
            classId: input.id,
            subjectId,
          })),
        );
      }
    });

    response.status(201).json({ id: input.id });
  }),
);

recordRouter.patch(
  "/classes/:id",
  asHandler(async (request, response) => {
    const { id } = parse(idParam, request.params, "path parameters");
    const input = parse(updateClassSchema, request.body, "class update");

    await getDb().transaction(async (tx) => {
      const record = await tx.query.classes.findFirst({
        where: (table, { eq: equals }) => equals(table.id, id),
      });
      if (!record) throw new HttpError(404, `Unknown class ${id}`);

      const patch: Partial<typeof schema.classes.$inferInsert> = {};
      if (input.name !== undefined) patch.name = input.name;
      if (input.shortName !== undefined) patch.shortName = input.shortName;
      if (input.active !== undefined) patch.active = input.active;

      if (Object.keys(patch).length > 0) {
        await tx.update(schema.classes).set(patch).where(eq(schema.classes.id, id));
      }

      if (!input.periods) return;

      const keep = new Set(input.periods.map((period) => period.id));
      const scheduled = await tx.query.entries.findMany({
        where: (table, { eq: equals }) => equals(table.classId, id),
        columns: { periodId: true },
      });
      const orphaned = [
        ...new Set(
          scheduled.map((entry) => entry.periodId).filter((period) => !keep.has(period)),
        ),
      ];

      if (orphaned.length > 0) {
        throw new HttpError(409, `Periods ${orphaned.join(", ")} still hold lectures`, {
          periods: orphaned,
        });
      }

      await tx.delete(schema.periods).where(eq(schema.periods.classId, id));
      await tx.insert(schema.periods).values(
        input.periods.map((period) => ({
          classId: id,
          periodId: period.id,
          name: period.name,
          label: period.label,
        })),
      );
    });

    response.json({ id });
  }),
);

recordRouter.delete(
  "/classes/:id",
  asHandler(async (request, response) => {
    const { id } = parse(idParam, request.params, "path parameters");

    const lectures = await getDb().$count(schema.entries, eq(schema.entries.classId, id));

    if (lectures > 0 && !forced(request.query.force)) {
      throw new HttpError(409, `${String(lectures)} lectures belong to this class`, {
        lectures,
      });
    }

    const deleted = await getDb()
      .delete(schema.classes)
      .where(eq(schema.classes.id, id))
      .returning({ id: schema.classes.id });

    if (deleted.length === 0) throw new HttpError(404, `Unknown class ${id}`);

    const remaining = await getDb()
      .select({ id: schema.classes.id, order: schema.classes.order })
      .from(schema.classes);

    const ordered = [...remaining].sort((a, b) => a.order - b.order);
    for (const [index, record] of ordered.entries()) {
      if (record.order === index) continue;
      await getDb()
        .update(schema.classes)
        .set({ order: index })
        .where(eq(schema.classes.id, record.id));
    }

    response.json({ id, removedLectures: lectures });
  }),
);
