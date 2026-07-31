import { promises as fs } from "node:fs";
import path from "node:path";

import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";
import { drizzle } from "drizzle-orm/neon-http";
import { z } from "zod";

import * as schema from "../src/db/schema";
import {
  classSchema,
  daySchema,
  entrySchema,
  schoolSchema,
  sectionSchema,
  subjectSchema,
  teacherSchema,
} from "../src/lib/schemas";

config({ path: ".env.local" });

const DATA_DIR = path.join(process.cwd(), "data");

async function readJson<T>(relativePath: string, parser: z.ZodType<T>): Promise<T> {
  const raw = await fs.readFile(path.join(DATA_DIR, relativePath), "utf8");
  const result = parser.safeParse(JSON.parse(raw));

  if (!result.success) {
    const detail = result.error.issues
      .slice(0, 8)
      .map((issue) => `  ${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("\n");
    throw new Error(`${relativePath} failed validation:\n${detail}`);
  }

  return result.data;
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");

  const db = drizzle(neon(url), { schema, casing: "snake_case" });

  const school = await readJson("school.json", schoolSchema);
  const days = await readJson("days.json", z.array(daySchema).min(1));
  const subjects = await readJson("subjects.json", z.array(subjectSchema));
  const teachers = await readJson("teachers.json", z.array(teacherSchema));
  const classes = await readJson("classes.json", z.array(classSchema).min(1));
  const sections = await readJson("sections.json", z.array(sectionSchema));

  const entries = (
    await Promise.all(
      classes.map(async (record) => {
        try {
          return await readJson(
            `entries/${record.id}.json`,
            z.array(entrySchema),
          );
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
          throw error;
        }
      }),
    )
  ).flat();

  const subjectIds = new Set(subjects.map((row) => row.id));
  const teacherIds = new Set(teachers.map((row) => row.id));
  const classIds = new Set(classes.map((row) => row.id));
  const sectionIds = new Set(sections.map((row) => row.id));
  const dayIds = new Set(days.map((row) => row.id));

  const problems: string[] = [];

  for (const section of sections) {
    if (!classIds.has(section.classId)) {
      problems.push(`section ${section.id} references unknown class ${section.classId}`);
    }
    for (const electiveId of section.electiveSubjectIds) {
      if (!subjectIds.has(electiveId)) {
        problems.push(`section ${section.id} references unknown subject ${electiveId}`);
      }
    }
  }

  for (const record of classes) {
    for (const subjectId of record.subjectIds) {
      if (!subjectIds.has(subjectId)) {
        problems.push(`class ${record.id} references unknown subject ${subjectId}`);
      }
    }
  }

  const periodKeys = new Set(
    classes.flatMap((record) => record.periods.map((p) => `${record.id}:${p.id}`)),
  );

  for (const entry of entries) {
    if (!classIds.has(entry.classId)) {
      problems.push(`entry ${entry.id} references unknown class ${entry.classId}`);
    }
    if (!sectionIds.has(entry.sectionId)) {
      problems.push(`entry ${entry.id} references unknown section ${entry.sectionId}`);
    }
    if (!periodKeys.has(`${entry.classId}:${entry.periodId}`)) {
      problems.push(
        `entry ${entry.id} uses period ${entry.periodId} undefined for class ${entry.classId}`,
      );
    }
    for (const dayId of entry.dayIds) {
      if (!dayIds.has(dayId)) {
        problems.push(`entry ${entry.id} references unknown day ${dayId}`);
      }
    }
    for (const assignment of entry.assignments) {
      if (!subjectIds.has(assignment.subjectId)) {
        problems.push(
          `entry ${entry.id} references unknown subject ${assignment.subjectId}`,
        );
      }
      if (assignment.teacherId && !teacherIds.has(assignment.teacherId)) {
        problems.push(
          `entry ${entry.id} references unknown teacher ${assignment.teacherId}`,
        );
      }
    }
  }

  if (problems.length > 0) {
    throw new Error(
      `Referential integrity failed:\n${problems.slice(0, 20).map((p) => `  ${p}`).join("\n")}`,
    );
  }

  console.log(
    `validated: ${subjects.length} subjects, ${teachers.length} teachers, ${classes.length} classes, ${sections.length} sections, ${entries.length} entries`,
  );

  await db.delete(schema.entryAssignments);
  await db.delete(schema.entryDays);
  await db.delete(schema.entries);
  await db.delete(schema.sectionElectives);
  await db.delete(schema.sections);
  await db.delete(schema.classSubjects);
  await db.delete(schema.periods);
  await db.delete(schema.classes);
  await db.delete(schema.teachers);
  await db.delete(schema.subjects);
  await db.delete(schema.days);
  await db.delete(schema.school);

  await db.insert(schema.school).values({
    id: "default",
    name: school.name,
    title: school.title,
    session: school.session,
  });

  await db.insert(schema.days).values(days);
  if (subjects.length) await db.insert(schema.subjects).values(subjects);
  if (teachers.length) await db.insert(schema.teachers).values(teachers);

  await db.insert(schema.classes).values(
    classes.map((record) => ({
      id: record.id,
      name: record.name,
      shortName: record.shortName,
      order: record.order,
      active: record.active,
    })),
  );

  const periodRows = classes.flatMap((record) =>
    record.periods.map((period) => ({
      classId: record.id,
      periodId: period.id,
      name: period.name,
      label: period.label,
    })),
  );
  if (periodRows.length) await db.insert(schema.periods).values(periodRows);

  const classSubjectRows = classes.flatMap((record) =>
    record.subjectIds.map((subjectId) => ({ classId: record.id, subjectId })),
  );
  if (classSubjectRows.length) {
    await db.insert(schema.classSubjects).values(classSubjectRows);
  }

  if (sections.length) {
    await db.insert(schema.sections).values(
      sections.map((section) => ({
        id: section.id,
        classId: section.classId,
        name: section.name,
        order: section.order,
        note: section.note,
      })),
    );
  }

  const electiveRows = sections.flatMap((section) =>
    section.electiveSubjectIds.map((subjectId, position) => ({
      sectionId: section.id,
      subjectId,
      position,
    })),
  );
  if (electiveRows.length) {
    await db.insert(schema.sectionElectives).values(electiveRows);
  }

  const chunk = <T>(rows: T[], size: number): T[][] => {
    const out: T[][] = [];
    for (let i = 0; i < rows.length; i += size) out.push(rows.slice(i, i + size));
    return out;
  };

  if (entries.length) {
    for (const batch of chunk(entries, 200)) {
      await db.insert(schema.entries).values(
        batch.map((entry) => ({
          id: entry.id,
          classId: entry.classId,
          sectionId: entry.sectionId,
          periodId: entry.periodId,
          note: entry.note,
        })),
      );
    }
  }

  const dayRows = entries.flatMap((entry) =>
    entry.dayIds.map((dayId) => ({ entryId: entry.id, dayId })),
  );
  for (const batch of chunk(dayRows, 400)) {
    await db.insert(schema.entryDays).values(batch);
  }

  const assignmentRows = entries.flatMap((entry) =>
    entry.assignments.map((assignment, position) => ({
      entryId: entry.id,
      position,
      subjectId: assignment.subjectId,
      teacherId: assignment.teacherId,
    })),
  );
  for (const batch of chunk(assignmentRows, 400)) {
    await db.insert(schema.entryAssignments).values(batch);
  }

  console.log(
    `seeded: ${periodRows.length} periods, ${classSubjectRows.length} class-subjects, ${electiveRows.length} electives, ${dayRows.length} entry-days, ${assignmentRows.length} assignments`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
