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

import { ApiError, fetchNotes, patchNote, removeNote, sendNote } from "./api";
import { readJson, writeJson } from "./cache";
import { makeLocalId } from "./local";
import { useStore } from "./store";

export type NotePatch = {
  title?: string;
  html?: string;
  preview?: string;
  pinned?: boolean;
};

type Status = "loading" | "ready" | "error";

type Cached = { notes: Note[]; dirty: string[]; removed: string[] };

type NotesValue = {
  notes: Note[];
  status: Status;
  offline: boolean;
  dirty: string[];
  refresh: () => Promise<void>;
  create: (title: string) => Promise<Note>;
  update: (id: string, patch: NotePatch) => void;
  remove: (id: string) => void;
};

const NotesContext = createContext<NotesValue | null>(null);

const LOCAL_MARKER = "_local_";

function cacheKey(classId: string): string {
  return `notes-${classId}`;
}

function sortNotes(notes: Note[]): Note[] {
  return [...notes].sort(
    (a, b) =>
      Number(b.pinned) - Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt),
  );
}

export function NotesProvider({ children }: { children: ReactNode }) {
  const { classId } = useStore();
  const [notes, setNotes] = useState<Note[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [offline, setOffline] = useState(false);
  const [dirty, setDirty] = useState<string[]>([]);

  const notesRef = useRef<Note[]>([]);
  const dirtyRef = useRef<string[]>([]);
  const removedRef = useRef<string[]>([]);
  const classRef = useRef(classId);

  const commit = useCallback((next: Note[], nextDirty: string[]) => {
    notesRef.current = next;
    dirtyRef.current = nextDirty;
    setNotes(sortNotes(next));
    setDirty(nextDirty);
    const cached: Cached = {
      notes: next,
      dirty: nextDirty,
      removed: removedRef.current,
    };
    writeJson(cacheKey(classRef.current), cached);
  }, []);

  const push = useCallback(async (): Promise<boolean> => {
    let list = notesRef.current;
    const stuck: string[] = [];
    let reachable = true;

    for (const id of removedRef.current) {
      try {
        await removeNote(id);
      } catch (cause) {
        if (!(cause instanceof ApiError)) reachable = false;
      }
    }
    if (reachable) removedRef.current = [];

    for (const id of dirtyRef.current) {
      const note = list.find((item) => item.id === id);
      if (!note) continue;
      const payload = {
        classId: note.classId,
        title: note.title,
        html: note.html,
        preview: note.preview,
        pinned: note.pinned,
      };
      try {
        const saved = id.includes(LOCAL_MARKER)
          ? await sendNote(payload)
          : await patchNote(id, payload);
        list = list.map((item) => (item.id === id ? saved : item));
      } catch (cause) {
        if (cause instanceof ApiError) continue;
        stuck.push(id);
        reachable = false;
      }
    }

    commit(list, stuck);
    return reachable;
  }, [commit]);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const schedulePush = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void push().then((reachable) => {
        setOffline(!reachable);
      });
    }, 1200);
  }, [push]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const refresh = useCallback(async () => {
    const startedFor = classRef.current;
    try {
      const reachable = await push();
      if (classRef.current !== startedFor) return;
      if (!reachable) {
        setOffline(true);
        setStatus("ready");
        return;
      }
      const fetched = await fetchNotes(startedFor);
      if (classRef.current !== startedFor) return;
      commit(fetched, []);
      setOffline(false);
      setStatus("ready");
    } catch {
      if (classRef.current !== startedFor) return;
      setOffline(true);
      setStatus(notesRef.current.length > 0 ? "ready" : "error");
    }
  }, [commit, push]);

  useEffect(() => {
    classRef.current = classId;
    notesRef.current = [];
    dirtyRef.current = [];
    removedRef.current = [];
    setNotes([]);
    setDirty([]);
    setStatus("loading");

    let cancelled = false;

    async function boot() {
      const cached = await readJson<Cached>(cacheKey(classId));
      if (cancelled) return;
      if (cached) {
        notesRef.current = cached.notes;
        dirtyRef.current = cached.dirty;
        removedRef.current = cached.removed;
        setNotes(sortNotes(cached.notes));
        setDirty(cached.dirty);
        setStatus("ready");
      }
      await refresh();
    }

    void boot();

    return () => {
      cancelled = true;
    };
  }, [classId, refresh]);

  const create = useCallback(
    async (title: string): Promise<Note> => {
      const now = new Date().toISOString();
      const draft: Note = {
        id: makeLocalId("not", classRef.current),
        classId: classRef.current,
        title,
        html: "",
        preview: "",
        pinned: false,
        createdAt: now,
        updatedAt: now,
      };

      try {
        const saved = await sendNote({
          classId: draft.classId,
          title: draft.title,
          html: draft.html,
          preview: draft.preview,
          pinned: draft.pinned,
        });
        commit([...notesRef.current, saved], dirtyRef.current);
        setOffline(false);
        return saved;
      } catch (cause) {
        if (cause instanceof ApiError) throw cause;
        setOffline(true);
        commit([...notesRef.current, draft], [...dirtyRef.current, draft.id]);
        return draft;
      }
    },
    [commit],
  );

  const update = useCallback(
    (id: string, patch: NotePatch) => {
      const next = notesRef.current.map((note) =>
        note.id === id
          ? { ...note, ...patch, updatedAt: new Date().toISOString() }
          : note,
      );
      const nextDirty = dirtyRef.current.includes(id)
        ? dirtyRef.current
        : [...dirtyRef.current, id];
      commit(next, nextDirty);
      schedulePush();
    },
    [commit, schedulePush],
  );

  const remove = useCallback(
    (id: string) => {
      if (!id.includes(LOCAL_MARKER)) removedRef.current = [...removedRef.current, id];
      commit(
        notesRef.current.filter((note) => note.id !== id),
        dirtyRef.current.filter((item) => item !== id),
      );
      schedulePush();
    },
    [commit, schedulePush],
  );

  const value = useMemo<NotesValue>(
    () => ({ notes, status, offline, dirty, refresh, create, update, remove }),
    [notes, status, offline, dirty, refresh, create, update, remove],
  );

  return <NotesContext.Provider value={value}>{children}</NotesContext.Provider>;
}

export function useNotes(): NotesValue {
  const value = useContext(NotesContext);
  if (!value) throw new Error("useNotes must be used inside NotesProvider");
  return value;
}
