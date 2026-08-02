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
import {
  applyFilters,
  buildFilterOptions,
  EMPTY_FILTERS,
  findClashes,
  resolveDataset,
  type Clash,
  type DerivedView,
  type FilterOptions,
  type Filters,
  type RawDataset,
  type ResolvedDataset,
} from "@kaksha/core";

import { ApiError, fetchRawDataset, sendOp } from "./api";
import { readJson, writeJson } from "./cache";
import { applyOp, enqueueOp, type LocalOp } from "./local";

type Status = "loading" | "ready" | "error";

type CachedDataset = { raw: RawDataset; fetchedAt: string };

export type MutationResult = "synced" | "queued";

export type ReloadResult = "synced" | "offline";

type SyncState = {
  syncing: boolean;
  offline: boolean;
  pending: number;
  lastSyncedAt: string | null;
};

type StoreValue = {
  status: Status;
  error: string | null;
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
  reload: () => Promise<ReloadResult>;
};

const StoreContext = createContext<StoreValue | null>(null);

function datasetKey(classId: string): string {
  return `dataset-${classId}`;
}

function queueKey(classId: string): string {
  return `queue-${classId}`;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [classId, setClassId] = useState("6");
  const [raw, setRaw] = useState<RawDataset | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [syncing, setSyncing] = useState(false);
  const [offline, setOffline] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  const rawRef = useRef<RawDataset | null>(null);
  const queueRef = useRef<LocalOp[]>([]);
  const classRef = useRef(classId);

  const commitRaw = useCallback((next: RawDataset, persist: boolean) => {
    rawRef.current = next;
    setRaw(next);
    if (persist) {
      const cached: CachedDataset = {
        raw: next,
        fetchedAt: new Date().toISOString(),
      };
      writeJson(datasetKey(classRef.current), cached);
    }
  }, []);

  const commitQueue = useCallback((next: LocalOp[]) => {
    queueRef.current = next;
    setPendingCount(next.length);
    writeJson(queueKey(classRef.current), next);
  }, []);

  const flushQueue = useCallback(async (): Promise<boolean> => {
    let queue = [...queueRef.current];
    while (queue.length > 0) {
      const op = queue[0];
      if (!op) break;
      try {
        await sendOp(op);
        queue = queue.slice(1);
        commitQueue(queue);
      } catch (cause) {
        if (cause instanceof ApiError) {
          queue = queue.slice(1);
          commitQueue(queue);
        } else {
          return false;
        }
      }
    }
    return true;
  }, [commitQueue]);

  const refresh = useCallback(
    async (silent: boolean): Promise<ReloadResult> => {
      const startedFor = classRef.current;
      setSyncing(true);
      if (!silent) {
        setStatus(rawRef.current ? "ready" : "loading");
        setError(null);
      }
      try {
        const flushed = await flushQueue();
        if (classRef.current !== startedFor) return "synced";
        if (!flushed) {
          setOffline(true);
          return "offline";
        }
        const fetched = await fetchRawDataset(startedFor);
        if (classRef.current !== startedFor) return "synced";
        commitRaw(fetched, true);
        setOffline(false);
        setLastSyncedAt(new Date().toISOString());
        setStatus("ready");
        setError(null);
        return "synced";
      } catch (cause) {
        if (classRef.current !== startedFor) return "offline";
        setOffline(true);
        if (!rawRef.current) {
          setError(cause instanceof Error ? cause.message : "Could not reach the server");
          setStatus("error");
        }
        return "offline";
      } finally {
        setSyncing(false);
      }
    },
    [commitRaw, flushQueue],
  );

  useEffect(() => {
    classRef.current = classId;
    rawRef.current = null;
    queueRef.current = [];
    setRaw(null);
    setPendingCount(0);
    setStatus("loading");
    setError(null);

    let cancelled = false;

    async function boot() {
      const [cached, queued] = await Promise.all([
        readJson<CachedDataset>(datasetKey(classId)),
        readJson<LocalOp[]>(queueKey(classId)),
      ]);
      if (cancelled) return;

      if (queued && queued.length > 0) {
        queueRef.current = queued;
        setPendingCount(queued.length);
      }
      if (cached) {
        rawRef.current = cached.raw;
        setRaw(cached.raw);
        setLastSyncedAt(cached.fetchedAt);
        setStatus("ready");
      }
      await refresh(cached !== null);
    }

    void boot();

    return () => {
      cancelled = true;
    };
  }, [classId, refresh]);

  const mutate = useCallback(
    async (op: LocalOp): Promise<MutationResult> => {
      const before = rawRef.current;
      if (!before) throw new Error("Dataset is not loaded yet");

      commitRaw(applyOp(before, op), true);

      if (queueRef.current.length > 0) {
        commitQueue(enqueueOp(queueRef.current, op));
        return "queued";
      }

      try {
        await sendOp(op);
        setOffline(false);
        setLastSyncedAt(new Date().toISOString());
        void refresh(true);
        return "synced";
      } catch (cause) {
        if (cause instanceof ApiError) {
          commitRaw(before, true);
          throw cause;
        }
        setOffline(true);
        commitQueue(enqueueOp(queueRef.current, op));
        return "queued";
      }
    },
    [commitQueue, commitRaw, refresh],
  );

  const reload = useCallback(() => refresh(false), [refresh]);

  const dataset = useMemo(() => (raw ? resolveDataset(raw) : null), [raw]);

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
    () => ({ syncing, offline, pending: pendingCount, lastSyncedAt }),
    [syncing, offline, pendingCount, lastSyncedAt],
  );

  const value = useMemo<StoreValue>(
    () => ({
      status,
      error,
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
      setClassId,
      mutate,
      reload,
    }),
    [
      status,
      error,
      classId,
      dataset,
      derived,
      options,
      clashes,
      filters,
      sync,
      mutate,
      reload,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const value = useContext(StoreContext);
  if (!value) throw new Error("useStore must be used inside StoreProvider");
  return value;
}
