import { useEffect, useMemo, useRef, useState } from "react";
import { resolveDataset, type RawDataset, type ResolvedDataset } from "@kaksha/core";

import { fetchRawDataset } from "./api";
import { readJson, writeJson } from "./cache";
import { type LocalOp } from "./local";

type CachedDataset = { raw: RawDataset; fetchedAt: string };

export type ClassDatasets = {
  datasets: ResolvedDataset[];
  loading: boolean;
  missing: string[];
};

async function loadClassRaw(classId: string): Promise<RawDataset | null> {
  const [cached, queued] = await Promise.all([
    readJson<CachedDataset>(`dataset-${classId}`),
    readJson<LocalOp[]>(`queue-${classId}`),
  ]);
  if (cached && queued && queued.length > 0) return cached.raw;

  try {
    const fetched = await fetchRawDataset(classId);
    writeJson(`dataset-${classId}`, {
      raw: fetched,
      fetchedAt: new Date().toISOString(),
    });
    return fetched;
  } catch {
    return cached?.raw ?? null;
  }
}

export function useClassDatasets(current: ResolvedDataset): ClassDatasets {
  const [others, setOthers] = useState<Map<string, ResolvedDataset | null> | null>(null);
  const startedFor = useRef<string | null>(null);

  useEffect(() => {
    if (startedFor.current === current.classId) return;
    startedFor.current = current.classId;
    setOthers(null);

    let cancelled = false;

    async function load() {
      const targets = current.classes.filter(
        (cls) => cls.active && cls.id !== current.classId,
      );
      const loaded = await Promise.all(
        targets.map(async (cls) => [cls.id, await loadClassRaw(cls.id)] as const),
      );
      if (cancelled) return;
      setOthers(
        new Map(loaded.map(([id, raw]) => [id, raw ? resolveDataset(raw) : null])),
      );
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [current]);

  const datasets = useMemo(() => {
    if (!others) return [current];
    const list: ResolvedDataset[] = [];
    for (const cls of current.classes) {
      if (cls.id === current.classId) {
        list.push(current);
      } else if (cls.active) {
        const resolved = others.get(cls.id);
        if (resolved) list.push(resolved);
      }
    }
    if (!list.includes(current)) list.unshift(current);
    return list;
  }, [current, others]);

  const missing = useMemo(() => {
    if (!others) return [];
    return current.classes
      .filter((cls) => cls.active && cls.id !== current.classId && !others.get(cls.id))
      .map((cls) => cls.name);
  }, [current, others]);

  return { datasets, loading: others === null, missing };
}
