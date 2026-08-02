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
import { AppState } from "react-native";
import {
  applyFilters,
  buildFilterOptions,
  EMPTY_FILTERS,
  findClashes,
  resolveDataset,
  sliceClass,
  type Clash,
  type Database,
  type DerivedView,
  type FilterOptions,
  type Filters,
  type ResolvedDataset,
} from "@kaksha/core";

import { ApiError, fetchSnapshot, sendOp } from "./api";
import { flushWrites, readJson, writeJson, writeJsonSoon } from "./cache";
import { applyOp, enqueueOp, type LocalOp } from "./local";
import { log, restoreLog } from "./log";

type Status = "loading" | "ready" | "error";

type CachedDatabase = { db: Database; etag: string | null; fetchedAt: string };

export type MutationResult = "synced" | "queued";

export type SyncResult = "synced" | "offline";

type SyncState = {
  syncing: boolean;
  offline: boolean;
  pending: number;
  queue: LocalOp[];
  lastSyncedAt: string | null;
};

type StoreValue = {
  status: Status;
  error: string | null;
  db: Database | null;
  classId: string;
  dataset: ResolvedDataset | null;
  derived: DerivedView | null;
  options: FilterOptions | null;
  clashes: Clash[];
  filters: Filters;
  sync: SyncState;
  setFilters: (next: Filters) => void;
  clearFilters: () => void;
  setClassId: (next: string) => void;
  mutate: (op: LocalOp) => Promise<MutationResult>;
  syncNow: () => Promise<SyncResult>;
  discardPending: () => void;
};

const StoreContext = createContext<StoreValue | null>(null);

const DATABASE_KEY = "database";
const QUEUE_KEY = "queue";
const CLASS_KEY = "class";

export function StoreProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<Database | null>(null);
  const [requestedClassId, setRequestedClassId] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [syncing, setSyncing] = useState(false);
  const [offline, setOffline] = useState(false);
  const [queue, setQueue] = useState<LocalOp[]>([]);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  const dbRef = useRef<Database | null>(null);
  const etagRef = useRef<string | null>(null);
  const queueRef = useRef<LocalOp[]>([]);

  const commitDb = useCallback((next: Database) => {
    dbRef.current = next;
    setDb(next);
    const cached: CachedDatabase = {
      db: next,
      etag: etagRef.current,
      fetchedAt: new Date().toISOString(),
    };
    writeJsonSoon(DATABASE_KEY, cached);
  }, []);

  const commitQueue = useCallback((next: LocalOp[]) => {
    queueRef.current = next;
    setQueue(next);
    writeJson(QUEUE_KEY, next);
  }, []);

  const flushQueue = useCallback(async (): Promise<boolean> => {
    let rest = [...queueRef.current];
    while (rest.length > 0) {
      const op = rest[0];
      if (!op) break;
      try {
        await sendOp(op);
        log.info("sync", `Sent ${op.kind}`);
        rest = rest.slice(1);
        commitQueue(rest);
      } catch (cause) {
        if (cause instanceof ApiError) {
          log.error("sync", `Server rejected ${op.kind}, dropping it`, cause);
          rest = rest.slice(1);
          commitQueue(rest);
        } else {
          log.warn("sync", `Could not send ${op.kind}, still offline`, cause);
          return false;
        }
      }
    }
    return true;
  }, [commitQueue]);

  const syncNow = useCallback(async (): Promise<SyncResult> => {
    setSyncing(true);
    try {
      if (!(await flushQueue())) {
        setOffline(true);
        return "offline";
      }

      const result = await fetchSnapshot(etagRef.current);
      if (result.kind === "fresh") {
        etagRef.current = result.etag;
        commitDb(result.db);
        log.info(
          "sync",
          `Pulled ${String(result.db.entries.length)} lectures across ${String(result.db.classes.length)} classes`,
        );
      } else {
        log.info("sync", "Already up to date");
      }

      setOffline(false);
      setLastSyncedAt(new Date().toISOString());
      setStatus("ready");
      setError(null);
      return "synced";
    } catch (cause) {
      log.error("sync", "Could not reach the server", cause);
      setOffline(true);
      if (!dbRef.current) {
        setError(cause instanceof Error ? cause.message : "Could not reach the server");
        setStatus("error");
      }
      return "offline";
    } finally {
      setSyncing(false);
    }
  }, [commitDb, flushQueue]);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      await restoreLog();
      const [cached, queued, savedClass] = await Promise.all([
        readJson<CachedDatabase>(DATABASE_KEY),
        readJson<LocalOp[]>(QUEUE_KEY),
        readJson<string>(CLASS_KEY),
      ]);
      if (cancelled) return;

      if (queued && queued.length > 0) {
        queueRef.current = queued;
        setQueue(queued);
        log.warn("start", `${String(queued.length)} changes are waiting to be sent`);
      }
      if (savedClass) setRequestedClassId(savedClass);
      if (cached) {
        dbRef.current = cached.db;
        etagRef.current = cached.etag;
        setDb(cached.db);
        setLastSyncedAt(cached.fetchedAt);
        setStatus("ready");
        log.info("start", `Opened the copy saved at ${cached.fetchedAt}`);
      } else {
        log.info("start", "No saved copy on this device, downloading everything");
      }

      await syncNow();
    }

    void boot();

    return () => {
      cancelled = true;
    };
  }, [syncNow]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (next) => {
      if (next === "active") {
        void syncNow();
        return;
      }
      flushWrites();
    });

    return () => {
      subscription.remove();
    };
  }, [syncNow]);

  const mutate = useCallback(
    async (op: LocalOp): Promise<MutationResult> => {
      const before = dbRef.current;
      if (!before) throw new Error("The timetable has not loaded yet");

      commitDb(applyOp(before, op));

      if (queueRef.current.length > 0) {
        commitQueue(enqueueOp(queueRef.current, op));
        return "queued";
      }

      try {
        await sendOp(op);
        log.info("edit", `Saved ${op.kind}`);
        setOffline(false);
        setLastSyncedAt(new Date().toISOString());
        void syncNow();
        return "synced";
      } catch (cause) {
        if (cause instanceof ApiError) {
          log.error("edit", `The server refused ${op.kind}, undoing it here`, cause);
          commitDb(before);
          throw cause;
        }
        log.warn(
          "edit",
          `Kept ${op.kind} on this device until the server is back`,
          cause,
        );
        setOffline(true);
        commitQueue(enqueueOp(queueRef.current, op));
        return "queued";
      }
    },
    [commitDb, commitQueue, syncNow],
  );

  const discardPending = useCallback(() => {
    log.warn("sync", `Discarded ${String(queueRef.current.length)} waiting changes`);
    commitQueue([]);
    void syncNow();
  }, [commitQueue, syncNow]);

  const chooseClass = useCallback((next: string) => {
    setRequestedClassId(next);
    writeJson(CLASS_KEY, next);
  }, []);

  const dataset = useMemo(() => {
    if (!db) return null;
    const raw = sliceClass(db, requestedClassId);
    return raw ? resolveDataset(raw) : null;
  }, [db, requestedClassId]);

  const derived = useMemo(
    () => (dataset ? applyFilters(dataset, filters) : null),
    [dataset, filters],
  );

  const options = useMemo(
    () => (dataset ? buildFilterOptions(dataset) : null),
    [dataset],
  );

  const clashes = useMemo(() => (dataset ? findClashes(dataset) : []), [dataset]);

  const sync = useMemo<SyncState>(
    () => ({ syncing, offline, pending: queue.length, queue, lastSyncedAt }),
    [syncing, offline, queue, lastSyncedAt],
  );

  const classId = dataset?.classId ?? "";

  const value = useMemo<StoreValue>(
    () => ({
      status,
      error,
      db,
      classId,
      dataset,
      derived,
      options,
      clashes,
      filters,
      sync,
      setFilters,
      clearFilters: () => {
        setFilters(EMPTY_FILTERS);
      },
      setClassId: chooseClass,
      mutate,
      syncNow,
      discardPending,
    }),
    [
      status,
      error,
      db,
      classId,
      dataset,
      derived,
      options,
      clashes,
      filters,
      sync,
      chooseClass,
      mutate,
      syncNow,
      discardPending,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const value = useContext(StoreContext);
  if (!value) throw new Error("useStore must be used inside StoreProvider");
  return value;
}
