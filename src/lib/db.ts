import "server-only";

import { promises as fs } from "node:fs";
import path from "node:path";
import { cache } from "react";

import type {
  ClassRecord,
  Day,
  Entry,
  School,
  Section,
  Subject,
  Teacher,
} from "./types";

const DATA_DIR = path.join(process.cwd(), "data");

async function readJson<T>(relativePath: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(path.join(DATA_DIR, relativePath), "utf8");
    return JSON.parse(raw) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return fallback;
    throw error;
  }
}

export const getSchool = cache(
  async (): Promise<School> =>
    readJson<School>("school.json", {
      name: "",
      title: "Kaksha",
      session: "",
      updatedAt: "",
    }),
);

export const getDays = cache(async (): Promise<Day[]> => {
  const days = await readJson<Day[]>("days.json", []);
  return [...days].sort((a, b) => a.order - b.order || a.id - b.id);
});

export const getSubjects = cache(
  async (): Promise<Subject[]> => readJson<Subject[]>("subjects.json", []),
);

export const getTeachers = cache(
  async (): Promise<Teacher[]> => readJson<Teacher[]>("teachers.json", []),
);

export const getClasses = cache(async (): Promise<ClassRecord[]> => {
  const classes = await readJson<ClassRecord[]>("classes.json", []);
  return [...classes].sort(
    (a, b) => a.order - b.order || a.id.localeCompare(b.id, undefined, { numeric: true }),
  );
});

export const getSections = cache(async (classId: string): Promise<Section[]> => {
  const sections = await readJson<Section[]>("sections.json", []);
  return sections
    .filter((section) => section.classId === classId)
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
});

export const getEntries = cache(async (classId: string): Promise<Entry[]> => {
  if (!/^[a-zA-Z0-9_-]+$/.test(classId)) return [];
  const entries = await readJson<Entry[]>(`entries/${classId}.json`, []);
  return entries.filter((entry) => entry.classId === classId);
});
