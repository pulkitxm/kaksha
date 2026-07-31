import Constants from "expo-constants";
import {
  type CreateEntryInput,
  type MergeSectionsInput,
  type RawDataset,
  type ReorderSectionsInput,
  type ResolvedDataset,
  resolveDataset,
} from "@kaksha/core";

const configured = Constants.expoConfig?.extra?.["apiUrl"];

export const API_URL =
  typeof configured === "string" && configured.length > 0
    ? configured.replace(/\/$/, "")
    : "https://kaksha-ppulkitxm.vercel.app";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });

  if (!response.ok) {
    const body = (await response.text()).slice(0, 300);
    throw new Error(`${String(response.status)} ${path}: ${body}`);
  }

  return (await response.json()) as T;
}

export async function fetchDataset(classId: string): Promise<ResolvedDataset> {
  const raw = await request<ResolvedDataset>(`/api/dataset?class=${classId}`);
  return resolveDataset(toRaw(raw));
}

function toRaw(dataset: ResolvedDataset): RawDataset {
  return {
    school: dataset.school,
    classes: dataset.classes,
    currentClass: dataset.currentClass,
    days: dataset.days,
    subjects: dataset.subjects,
    teachers: dataset.teachers,
    sections: dataset.sections.map((section) => ({
      id: section.id,
      classId: section.classId,
      name: section.name,
      order: section.order,
      note: section.note,
      electiveSubjectIds: section.electives.map((subject) => subject.id),
    })),
    entries: dataset.entries.map((entry) => ({
      id: entry.id,
      classId: entry.classId,
      sectionId: entry.sectionId,
      periodId: entry.periodId,
      dayIds: entry.dayIds,
      note: entry.note,
      assignments: entry.assignments.map((assignment) => ({
        subjectId: assignment.subject.id,
        teacherId: assignment.teacher?.id ?? null,
      })),
    })),
  };
}

export type EntryPatch = {
  sectionId?: string;
  periodId?: number;
  dayIds?: number[];
  assignments?: { subjectId: string; teacherId: string | null }[];
  note?: string | null;
};

export function updateEntry(id: string, patch: EntryPatch): Promise<{ id: string }> {
  return request(`/api/entries/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export function createEntry(input: CreateEntryInput): Promise<{ id: string }> {
  return request("/api/entries", { method: "POST", body: JSON.stringify(input) });
}

export function deleteEntry(id: string): Promise<{ id: string }> {
  return request(`/api/entries/${id}`, { method: "DELETE" });
}

export function renameSection(id: string, name: string): Promise<{ id: string }> {
  return request(`/api/sections/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ name }),
  });
}

export function mergeSections(input: MergeSectionsInput): Promise<{ removed: string }> {
  return request("/api/sections/merge", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function reorderSections(
  input: ReorderSectionsInput,
): Promise<{ sections: { id: string; name: string }[] }> {
  return request("/api/sections/reorder", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function reassign(input: {
  classId: string;
  fromTeacherId?: string;
  toTeacherId?: string | null;
  fromSubjectId?: string;
  toSubjectId?: string;
  sectionIds?: string[];
  periodIds?: number[];
  dayIds?: number[];
}): Promise<{ updated: number }> {
  return request("/api/entries/reassign", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
