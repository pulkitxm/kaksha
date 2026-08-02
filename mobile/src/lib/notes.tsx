import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Note } from "@kaksha/core";

import { ApiError, patchNote, removeNote, sendNote } from "./api";
import { readJson, writeJson } from "./cache";
import { newId } from "./ids";
import { useStore } from "./store";

export type NotePatch = {
  title?: string;
  html?: string;
  preview?: string;
  pinned?: boolean;
};

type Status = "loading" | "ready";

type LocalNotes = { drafts: Note[]; dirty: string[]; removed: string[] };

type NotesValue = {
  notes: Note[];
  status: Status;
  offline: boolean;
  dirty: string[];
  refresh: () => Promise<void>;
  create: (title: string) => Note;
  update: (id: string, patch: NotePatch) => void;
  remove: (id: string) => void;
};

const NotesContext = createContext<NotesValue | null>(null);

const LOCAL_KEY = "notes-local";
const PUSH_DELAY_MS = 1200;

const EMPTY_LOCAL: LocalNotes = { drafts: [], dirty: [], removed: [] };

function sortNotes(notes: Note[]): Note[] {
  return [...notes].sort(
    (a, b) =>
      Number(b.pinned) - Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt),
  );
}

function payloadOf(note: Note) {
  return {
    classId: note.classId,
    title: note.title,
    html: note.html,
    preview: note.preview,
    pinned: note.pinned,
  };
}

export function NotesProvider({ children }: { children: ReactNode }) {
  const store = useStore();
  const { db, classId, status: storeStatus, syncNow } = store;
  const [local, setLocal] = useState<LocalNotes>(EMPTY_LOCAL);
  const [offline, setOffline] = useState(false);
  const [booted, setBooted] = useState(false);

  const localRef = useRef<LocalNotes>(EMPTY_LOCAL);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const commit = useCallback((next: LocalNotes) => {
    localRef.current = next;
    setLocal(next);
    writeJson(LOCAL_KEY, next);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      const cached = await readJson<LocalNotes>(LOCAL_KEY);
      if (cancelled) return;
      if (cached) {
        localRef.current = cached;
        setLocal(cached);
      }
      setBooted(true);
    }

    void boot();

    return () => {
      cancelled = true;
    };
  }, []);

  const push = useCallback(async (): Promise<boolean> => {
    let current = localRef.current;
    let reachable = true;

    for (const id of current.removed) {
      try {
        await removeNote(id);
        current = { ...current, removed: current.removed.filter((it) => it !== id) };
      } catch (cause) {
        if (cause instanceof ApiError) {
          current = { ...current, removed: current.removed.filter((it) => it !== id) };
        } else {
          reachable = false;
        }
      }
    }

    for (const id of current.dirty) {
      const draft = current.drafts.find((note) => note.id === id);
      if (!draft) {
        current = { ...current, dirty: current.dirty.filter((it) => it !== id) };
        continue;
      }
      try {
        const saved = db?.notes.some((note) => note.id === id)
          ? await patchNote(id, payloadOf(draft))
          : await sendNote({ id, ...payloadOf(draft) });
        current = {
          ...current,
          drafts: current.drafts.map((note) => (note.id === id ? saved : note)),
          dirty: current.dirty.filter((it) => it !== id),
        };
      } catch (cause) {
        if (cause instanceof ApiError) {
          current = { ...current, dirty: current.dirty.filter((it) => it !== id) };
        } else {
          reachable = false;
        }
      }
    }

    commit(current);
    return reachable;
  }, [commit, db]);

  const refresh = useCallback(async () => {
    const reachable = await push();
    setOffline(!reachable);
    if (reachable) await syncNow();
  }, [push, syncNow]);

  const schedulePush = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void refresh();
    }, PUSH_DELAY_MS);
  }, [refresh]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  useEffect(() => {
    if (!db) return;
    const serverById = new Map(db.notes.map((note) => [note.id, note]));
    const current = localRef.current;

    const drafts = current.drafts.filter((draft) => {
      if (current.dirty.includes(draft.id)) return true;
      const server = serverById.get(draft.id);
      return !server || server.updatedAt < draft.updatedAt;
    });
    const removed = current.removed.filter((id) => serverById.has(id));

    if (
      drafts.length === current.drafts.length &&
      removed.length === current.removed.length
    ) {
      return;
    }
    commit({ ...current, drafts, removed });
  }, [commit, db]);

  const notes = useMemo(() => {
    const removed = new Set(local.removed);
    const merged = new Map<string, Note>();

    for (const note of db?.notes ?? []) {
      if (!removed.has(note.id)) merged.set(note.id, note);
    }
    for (const draft of local.drafts) {
      if (!removed.has(draft.id)) merged.set(draft.id, draft);
    }

    return sortNotes(
      [...merged.values()].filter(
        (note) => note.classId === null || note.classId === classId,
      ),
    );
  }, [classId, db, local]);

  const create = useCallback(
    (title: string): Note => {
      const now = new Date().toISOString();
      const draft: Note = {
        id: newId("not"),
        classId,
        title,
        html: "",
        preview: "",
        pinned: false,
        createdAt: now,
        updatedAt: now,
      };

      const current = localRef.current;
      commit({
        ...current,
        drafts: [...current.drafts, draft],
        dirty: [...current.dirty, draft.id],
      });
      schedulePush();
      return draft;
    },
    [classId, commit, schedulePush],
  );

  const update = useCallback(
    (id: string, patch: NotePatch) => {
      const current = localRef.current;
      const base =
        current.drafts.find((note) => note.id === id) ??
        db?.notes.find((note) => note.id === id);
      if (!base) return;

      const next: Note = { ...base, ...patch, updatedAt: new Date().toISOString() };
      commit({
        ...current,
        drafts: [...current.drafts.filter((note) => note.id !== id), next],
        dirty: current.dirty.includes(id) ? current.dirty : [...current.dirty, id],
      });
      schedulePush();
    },
    [commit, db, schedulePush],
  );

  const remove = useCallback(
    (id: string) => {
      const current = localRef.current;
      const onServer = db?.notes.some((note) => note.id === id) ?? false;
      commit({
        drafts: current.drafts.filter((note) => note.id !== id),
        dirty: current.dirty.filter((it) => it !== id),
        removed: onServer ? [...current.removed, id] : current.removed,
      });
      schedulePush();
    },
    [commit, db, schedulePush],
  );

  const status: Status = booted && storeStatus !== "loading" ? "ready" : "loading";

  const value = useMemo<NotesValue>(
    () => ({
      notes,
      status,
      offline,
      dirty: local.dirty,
      refresh,
      create,
      update,
      remove,
    }),
    [notes, status, offline, local.dirty, refresh, create, update, remove],
  );

  return <NotesContext.Provider value={value}>{children}</NotesContext.Provider>;
}

export function useNotes(): NotesValue {
  const value = useContext(NotesContext);
  if (!value) throw new Error("useNotes must be used inside NotesProvider");
  return value;
}
