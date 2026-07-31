import Constants from "expo-constants";
import {
  type CreateEntryInput,
  type MergeSectionsInput,
  type RawDataset,
  type ReorderSectionsInput,
  type ResolvedDataset,
} from "@kaksha/core";

import { type EntryPatch, type LocalOp } from "./local";

const configured = Constants.expoConfig?.extra?.["apiUrl"];

const API_URL =
  typeof configured === "string" && configured.length > 0
    ? configured.replace(/\/$/, "")
    : "https://kaksha-ppulkitxm.vercel.app";

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

const REQUEST_TIMEOUT_MS = 12000;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
    });

    if (!response.ok) {
      const body = (await response.text()).slice(0, 300);
      throw new ApiError(response.status, `${String(response.status)} ${path}: ${body}`);
    }

    return (await response.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchRawDataset(classId: string): Promise<RawDataset> {
  const dataset = await request<ResolvedDataset>(`/api/dataset?class=${classId}`);
  return toRaw(dataset);
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

function updateEntry(id: string, patch: EntryPatch): Promise<{ id: string }> {
  return request(`/api/entries/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

function createEntry(input: CreateEntryInput): Promise<{ id: string }> {
  return request("/api/entries", { method: "POST", body: JSON.stringify(input) });
}

function deleteEntry(id: string): Promise<{ id: string }> {
  return request(`/api/entries/${id}`, { method: "DELETE" });
}

function renameSection(id: string, name: string): Promise<{ id: string }> {
  return request(`/api/sections/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ name }),
  });
}

function mergeSections(input: MergeSectionsInput): Promise<{ removed: string }> {
  return request("/api/sections/merge", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

function reorderSections(
  input: ReorderSectionsInput,
): Promise<{ sections: { id: string; name: string }[] }> {
  return request("/api/sections/reorder", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function sendOp(op: LocalOp): Promise<void> {
  switch (op.kind) {
    case "createEntry":
      await createEntry(op.input);
      return;
    case "updateEntry":
      await updateEntry(op.id, op.patch);
      return;
    case "deleteEntry":
      await deleteEntry(op.id);
      return;
    case "renameSection":
      await renameSection(op.id, op.name);
      return;
    case "mergeSections":
      await mergeSections(op.input);
      return;
    case "reorderSections":
      await reorderSections(op.input);
      return;
  }
}
