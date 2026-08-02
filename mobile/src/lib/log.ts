import { useSyncExternalStore } from "react";

import { readJson, writeJsonSoon } from "./cache";

export type LogLevel = "info" | "warn" | "error";

export type LogEntry = {
  id: string;
  at: string;
  level: LogLevel;
  scope: string;
  message: string;
  detail: string | null;
};

const LOG_KEY = "log";
const LIMIT = 400;

let entries: LogEntry[] = [];
let counter = 0;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

function describe(detail: unknown): string | null {
  if (detail === undefined || detail === null) return null;
  if (typeof detail === "string") return detail.slice(0, 2000);
  if (detail instanceof Error) return `${detail.name}: ${detail.message}`;
  try {
    return JSON.stringify(detail).slice(0, 2000);
  } catch {
    return String(detail).slice(0, 2000);
  }
}

function record(level: LogLevel, scope: string, message: string, detail?: unknown): void {
  counter += 1;
  const entry: LogEntry = {
    id: `${String(Date.now())}-${String(counter)}`,
    at: new Date().toISOString(),
    level,
    scope,
    message,
    detail: describe(detail),
  };
  entries = [entry, ...entries].slice(0, LIMIT);
  writeJsonSoon(LOG_KEY, entries);
  emit();
}

export const log = {
  info(scope: string, message: string, detail?: unknown): void {
    record("info", scope, message, detail);
  },
  warn(scope: string, message: string, detail?: unknown): void {
    record("warn", scope, message, detail);
  },
  error(scope: string, message: string, detail?: unknown): void {
    record("error", scope, message, detail);
  },
};

let restored = false;

export async function restoreLog(): Promise<void> {
  if (restored) return;
  restored = true;
  const cached = await readJson<LogEntry[]>(LOG_KEY);
  if (!cached) return;
  const known = new Set(entries.map((entry) => entry.id));
  entries = [...entries, ...cached.filter((entry) => !known.has(entry.id))].slice(
    0,
    LIMIT,
  );
  emit();
}

export function clearLog(): void {
  entries = [];
  writeJsonSoon(LOG_KEY, entries);
  emit();
}

export function formatLog(list: LogEntry[]): string {
  return list
    .map((entry) => {
      const head = `${entry.at} ${entry.level.toUpperCase()} [${entry.scope}] ${entry.message}`;
      return entry.detail ? `${head}\n    ${entry.detail}` : head;
    })
    .join("\n");
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function snapshot(): LogEntry[] {
  return entries;
}

export function useLog(): LogEntry[] {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}
