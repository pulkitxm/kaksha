"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import type { ClassSummary } from "@/lib/types";

function useParamSetter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function setParam(key: string, value: string | null, resetFilters = false) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === null) params.delete(key);
    else params.set(key, value);

    if (resetFilters) {
      for (const filterKey of ["teacher", "subject", "section", "day", "period", "group", "q"]) {
        params.delete(filterKey);
      }
    }

    const query = params.toString();
    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    });
  }

  return { setParam, isPending, searchParams };
}

export function ClassSwitcher({
  classes,
  currentClassId,
}: {
  classes: ClassSummary[];
  currentClassId: string;
}) {
  const { setParam } = useParamSetter();

  return (
    <div className="relative">
      <select
        value={currentClassId}
        onChange={(event) => setParam("class", event.target.value, true)}
        aria-label="Select class"
        className="h-9 appearance-none rounded-lg border border-line bg-panel py-0 pl-3 pr-8 text-sm font-medium outline-none transition-colors hover:border-line-strong focus:border-line-strong"
      >
        {classes.map((record) => (
          <option key={record.id} value={record.id}>
            {record.name}
            {record.active ? "" : " (empty)"}
          </option>
        ))}
      </select>
      <svg
        viewBox="0 0 16 16"
        className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 opacity-60"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        aria-hidden="true"
      >
        <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

const VIEWS = [
  { id: "grid", label: "Grid" },
  { id: "list", label: "List" },
  { id: "teachers", label: "Teachers" },
] as const;

export function ViewTabs({ current }: { current: string }) {
  const { setParam } = useParamSetter();

  return (
    <div
      role="tablist"
      aria-label="Timetable view"
      className="inline-flex h-9 items-center gap-0.5 rounded-lg border border-line bg-panel p-0.5"
    >
      {VIEWS.map((view) => {
        const active = view.id === current;
        return (
          <button
            key={view.id}
            role="tab"
            aria-selected={active}
            type="button"
            onClick={() => setParam("view", view.id === "grid" ? null : view.id)}
            className={`rounded-md px-3 py-1 text-sm transition-colors ${
              active
                ? "bg-fg text-bg"
                : "text-fg-muted hover:bg-panel-hover hover:text-fg"
            }`}
          >
            {view.label}
          </button>
        );
      })}
    </div>
  );
}

export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
    setMounted(true);
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("tt-theme", next ? "dark" : "light");
    } catch {}
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle theme"
      className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-panel text-fg-muted transition-colors hover:border-line-strong hover:text-fg"
    >
      {mounted && dark ? (
        <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <circle cx="8" cy="8" r="3.2" />
          <path d="M8 1v1.6M8 13.4V15M15 8h-1.6M2.6 8H1M12.9 3.1l-1.1 1.1M4.2 11.8l-1.1 1.1M12.9 12.9l-1.1-1.1M4.2 4.2L3.1 3.1" strokeLinecap="round" />
        </svg>
      ) : (
        <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <path d="M13.5 9.6A5.8 5.8 0 016.4 2.5a5.8 5.8 0 107.1 7.1z" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
}

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      aria-label="Print timetable"
      className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-panel text-fg-muted transition-colors hover:border-line-strong hover:text-fg"
    >
      <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <path d="M4.5 6V2.5h7V6M4.5 12H3a1 1 0 01-1-1V7a1 1 0 011-1h10a1 1 0 011 1v4a1 1 0 01-1 1h-1.5" strokeLinejoin="round" />
        <rect x="4.5" y="9.5" width="7" height="4" rx="0.5" />
      </svg>
    </button>
  );
}
