import { randomUUID } from "node:crypto";

import { createNoteSchema, updateNoteSchema } from "@kaksha/core";
import { eq } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";

import { getDb, schema } from "../db/client.js";
import { getNotes, toNote } from "../db/queries.js";
import { asHandler, HttpError } from "../http.js";

export const noteRouter: Router = Router();

const idParam = z.object({ id: z.string().min(1).max(120) });

function parse<T>(parser: z.ZodType<T>, value: unknown, label: string): T {
  const result = parser.safeParse(value);
  if (!result.success) {
    throw new HttpError(400, `Invalid ${label}`, z.treeifyError(result.error));
  }
  return result.data;
}

noteRouter.get(
  "/notes",
  asHandler(async (request, response) => {
    const classFilter =
      typeof request.query.class === "string" ? request.query.class : null;

    const notes = (await getNotes()).filter(
      (note) => !classFilter || note.classId === null || note.classId === classFilter,
    );

    response.json({ notes });
  }),
);

noteRouter.post(
  "/notes",
  asHandler(async (request, response) => {
    const input = parse(createNoteSchema, request.body, "note");
    const id = `not_${randomUUID().replace(/-/g, "").slice(0, 16)}`;

    const [row] = await getDb()
      .insert(schema.notes)
      .values({
        id,
        classId: input.classId,
        title: input.title,
        html: input.html,
        preview: input.preview,
        pinned: input.pinned,
      })
      .returning();

    if (!row) throw new HttpError(500, "Could not create the note");
    response.status(201).json({ note: toNote(row) });
  }),
);

noteRouter.patch(
  "/notes/:id",
  asHandler(async (request, response) => {
    const { id } = parse(idParam, request.params, "path parameters");
    const input = parse(updateNoteSchema, request.body, "note update");

    const [row] = await getDb()
      .update(schema.notes)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(schema.notes.id, id))
      .returning();

    if (!row) throw new HttpError(404, `Unknown note ${id}`);
    response.json({ note: toNote(row) });
  }),
);

noteRouter.delete(
  "/notes/:id",
  asHandler(async (request, response) => {
    const { id } = parse(idParam, request.params, "path parameters");

    const deleted = await getDb()
      .delete(schema.notes)
      .where(eq(schema.notes.id, id))
      .returning({ id: schema.notes.id });

    if (deleted.length === 0) throw new HttpError(404, `Unknown note ${id}`);
    response.json({ id });
  }),
);
