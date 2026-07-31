import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  applyFilters,
  buildFilterOptions,
  EMPTY_FILTERS,
  type DerivedView,
  type FilterOptions,
  type Filters,
  type ResolvedDataset,
} from "@kaksha/core";

import { fetchDataset } from "./api";

type Status = "loading" | "ready" | "error";

type StoreValue = {
  status: Status;
  error: string | null;
  classId: string;
  dataset: ResolvedDataset | null;
  derived: DerivedView | null;
  options: FilterOptions | null;
  filters: Filters;
  setFilters: (next: Filters) => void;
  clearFilters: () => void;
  setClassId: (next: string) => void;
  refresh: () => Promise<void>;
};

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [classId, setClassId] = useState("6");
  const [dataset, setDataset] = useState<ResolvedDataset | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);

  const load = useCallback(async (target: string) => {
    setStatus("loading");
    setError(null);
    try {
      setDataset(await fetchDataset(target));
      setStatus("ready");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not reach the server");
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    void load(classId);
  }, [classId, load]);

  const derived = useMemo(
    () => (dataset ? applyFilters(dataset, filters) : null),
    [dataset, filters],
  );

  const options = useMemo(
    () => (dataset ? buildFilterOptions(dataset) : null),
    [dataset],
  );

  const value = useMemo<StoreValue>(
    () => ({
      status,
      error,
      classId,
      dataset,
      derived,
      options,
      filters,
      setFilters,
      clearFilters: () => {
        setFilters(EMPTY_FILTERS);
      },
      setClassId,
      refresh: () => load(classId),
    }),
    [status, error, classId, dataset, derived, options, filters, load],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const value = useContext(StoreContext);
  if (!value) throw new Error("useStore must be used inside StoreProvider");
  return value;
}
