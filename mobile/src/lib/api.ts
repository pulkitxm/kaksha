import Constants from "expo-constants";
import {
  databaseSchema,
  noteSchema,
  type CreateClassInput,
  type CreateEntryInput,
  type CreateNoteInput,
  type CreateSectionInput,
  type CreateSubjectInput,
  type CreateTeacherInput,
  type Database,
  type MergeSectionsInput,
  type Note,
  type ReorderSectionsInput,
  type UpdateClassInput,
  type UpdateNoteInput,
  type UpdateSubjectInput,
  type UpdateTeacherInput,
} from "@kaksha/core";

import { type EntryPatch, type LocalOp } from "./local";

const configured =
  process.env.EXPO_PUBLIC_API_URL ?? Constants.expoConfig?.extra?.["apiUrl"];

const API_URL =
  typeof configured === "string" && configured.length > 0
    ? configured.replace(/\/$/, "")
    : "https://kaksha.pulkit.page";

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

const REQUEST_TIMEOUT_MS = 12000;
const SNAPSHOT_TIMEOUT_MS = 30000;

async function send(
  path: string,
  init: RequestInit | undefined,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    return await fetch(`${API_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
    });
  } finally {
    clearTimeout(timer);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await send(path, init, REQUEST_TIMEOUT_MS);

  if (!response.ok) {
    const body = (await response.text()).slice(0, 300);
    throw new ApiError(response.status, `${String(response.status)} ${path}: ${body}`);
  }

  return (await response.json()) as T;
}

export type SnapshotResult =
  { kind: "unchanged" } | { kind: "fresh"; db: Database; etag: string | null };

export async function fetchSnapshot(etag: string | null): Promise<SnapshotResult> {
  const response = await send(
    "/api/snapshot",
    etag ? { headers: { "if-none-match": etag } } : undefined,
    SNAPSHOT_TIMEOUT_MS,
  );

  if (response.status === 304) return { kind: "unchanged" };

  if (!response.ok) {
    const body = (await response.text()).slice(0, 300);
    throw new ApiError(
      response.status,
      `${String(response.status)} /api/snapshot: ${body}`,
    );
  }

  return {
    kind: "fresh",
    db: databaseSchema.parse(await response.json()),
    etag: response.headers.get("etag"),
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

function createSection(input: CreateSectionInput): Promise<{ id: string }> {
  return request("/api/sections", { method: "POST", body: JSON.stringify(input) });
}

function deleteSection(id: string): Promise<{ removed: string }> {
  return request(`/api/sections/${id}`, { method: "DELETE" });
}

function setSectionElectives(
  id: string,
  electiveSubjectIds: string[],
): Promise<{ id: string }> {
  return request(`/api/sections/${id}/electives`, {
    method: "PUT",
    body: JSON.stringify({ electiveSubjectIds }),
  });
}

function createTeacher(input: CreateTeacherInput): Promise<{ id: string }> {
  return request("/api/teachers", { method: "POST", body: JSON.stringify(input) });
}

function updateTeacher(id: string, patch: UpdateTeacherInput): Promise<{ id: string }> {
  return request(`/api/teachers/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

function deleteTeacher(id: string, force: boolean): Promise<{ id: string }> {
  return request(`/api/teachers/${id}${force ? "?force=1" : ""}`, { method: "DELETE" });
}

function createSubject(input: CreateSubjectInput): Promise<{ id: string }> {
  return request("/api/subjects", { method: "POST", body: JSON.stringify(input) });
}

function updateSubject(id: string, patch: UpdateSubjectInput): Promise<{ id: string }> {
  return request(`/api/subjects/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

function deleteSubject(id: string): Promise<{ id: string }> {
  return request(`/api/subjects/${id}`, { method: "DELETE" });
}

function setClassSubjects(
  classId: string,
  subjectIds: string[],
): Promise<{ id: string }> {
  return request(`/api/classes/${classId}/subjects`, {
    method: "PUT",
    body: JSON.stringify({ subjectIds }),
  });
}

function createClass(input: CreateClassInput): Promise<{ id: string }> {
  return request("/api/classes", { method: "POST", body: JSON.stringify(input) });
}

function updateClass(id: string, patch: UpdateClassInput): Promise<{ id: string }> {
  return request(`/api/classes/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
}

function deleteClass(id: string, force: boolean): Promise<{ id: string }> {
  return request(`/api/classes/${id}${force ? "?force=1" : ""}`, { method: "DELETE" });
}

export async function sendNote(input: CreateNoteInput): Promise<Note> {
  const payload = await request<{ note: unknown }>("/api/notes", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return noteSchema.parse(payload.note);
}

export async function patchNote(id: string, input: UpdateNoteInput): Promise<Note> {
  const payload = await request<{ note: unknown }>(`/api/notes/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return noteSchema.parse(payload.note);
}

export async function removeNote(id: string): Promise<void> {
  await request(`/api/notes/${id}`, { method: "DELETE" });
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
    case "createSection":
      await createSection(op.input);
      return;
    case "deleteSection":
      await deleteSection(op.id);
      return;
    case "setSectionElectives":
      await setSectionElectives(op.id, op.electiveSubjectIds);
      return;
    case "createTeacher":
      await createTeacher(op.input);
      return;
    case "updateTeacher":
      await updateTeacher(op.id, op.patch);
      return;
    case "deleteTeacher":
      await deleteTeacher(op.id, op.force);
      return;
    case "createSubject":
      await createSubject(op.input);
      return;
    case "updateSubject":
      await updateSubject(op.id, op.patch);
      return;
    case "deleteSubject":
      await deleteSubject(op.id);
      return;
    case "setClassSubjects":
      await setClassSubjects(op.classId, op.subjectIds);
      return;
    case "createClass":
      await createClass(op.input);
      return;
    case "updateClass":
      await updateClass(op.id, op.patch);
      return;
    case "deleteClass":
      await deleteClass(op.id, op.force);
      return;
  }
}
