"use client";

import { useCallback, useMemo, useState } from "react";

import { applyFilters, buildFilterOptions } from "@/lib/derive";
import type { Filters, ResolvedDataset, TimetableView } from "@/lib/types";

import { Brand } from "./Brand";
import { FilterBar } from "./FilterBar";
import { ListView } from "./ListView";
import { ShareDialog } from "./ShareDialog";
import { DayLegend, Legend, StatCards } from "./StatCards";
import { TeacherAvailability } from "./TeacherAvailability";
import { TeacherLoadTable } from "./TeacherLoadTable";
import { TimetableGrid } from "./TimetableGrid";
import { ClassSwitcher, PrintButton, ThemeToggle, ViewTabs } from "./Toolbar";

function toSearch(filters: Filters, view: TimetableView, classId: string): string {
  const params = new URLSearchParams();
  params.set("class", classId);
  if (view !== "grid") params.set("view", view);
  if (filters.teacher.length) params.set("teacher", filters.teacher.join(","));
  if (filters.subject.length) params.set("subject", filters.subject.join(","));
  if (filters.section.length) params.set("section", filters.section.join(","));
  if (filters.group.length) params.set("group", filters.group.join(","));
  if (filters.day.length) params.set("day", filters.day.join(","));
  if (filters.period.length) params.set("period", filters.period.join(","));
  if (filters.q) params.set("q", filters.q);
  return params.toString();
}

export function TimetableApp({
  dataset,
  initialFilters,
  initialView,
}: {
  dataset: ResolvedDataset;
  initialFilters: Filters;
  initialView: TimetableView;
}) {
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [view, setView] = useState<TimetableView>(initialView);

  const filterOptions = useMemo(() => buildFilterOptions(dataset), [dataset]);
  const derived = useMemo(() => applyFilters(dataset, filters), [dataset, filters]);

  const syncUrl = useCallback(
    (next: Filters, nextView: TimetableView) => {
      if (typeof window === "undefined") return;
      const search = toSearch(next, nextView, dataset.classId);
      window.history.replaceState(null, "", `${window.location.pathname}?${search}`);
    },
    [dataset.classId],
  );

  const updateFilters = useCallback(
    (next: Filters) => {
      setFilters(next);
      syncUrl(next, view);
    },
    [syncUrl, view],
  );

  const updateView = useCallback(
    (next: TimetableView) => {
      setView(next);
      syncUrl(filters, next);
    },
    [syncUrl, filters],
  );

  const shareSearch = useMemo(
    () => toSearch(filters, view, dataset.classId),
    [filters, view, dataset.classId],
  );

  const errors = dataset.issues.filter((issue) => issue.level === "error");

  const defaultTeacherId =
    filters.teacher.find((id) => filterOptions.teachers.some((t) => t.id === id)) ??
    filterOptions.teachers[0]?.id ??
    "";

  return (
    <>
      <header className="no-print sticky top-0 z-30 border-b border-line bg-bg/80 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-[1600px] flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
          <Brand />

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <ClassSwitcher classes={dataset.classes} currentClassId={dataset.classId} />
            <span className="hidden text-xs text-fg-faint lg:inline">
              {dataset.sections.length} sections · {dataset.periods.length} periods
            </span>
            <ViewTabs current={view} onChange={updateView} />
            <ShareDialog
              teachers={filterOptions.teachers}
              defaultTeacherId={defaultTeacherId}
              search={shareSearch}
            />
            <PrintButton />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1600px] flex-1 space-y-6 px-4 py-6 sm:px-6">
        <FilterBar
          options={filterOptions}
          filters={filters}
          onChange={updateFilters}
        />

        <div className="space-y-6">
          <StatCards stats={derived.stats} filtersActive={derived.filtersActive} />

          {errors.length > 0 ? (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4">
              <p className="text-sm font-medium text-rose-700 dark:text-rose-300">
                {errors.length} data {errors.length === 1 ? "issue" : "issues"} found
              </p>
              <ul className="mt-2 space-y-1">
                {errors.slice(0, 5).map((issue, index) => (
                  <li key={index} className="font-mono text-xs text-fg-muted">
                    {issue.id}: {issue.message}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {view === "list" ? (
            <div className="space-y-4">
              <TeacherAvailability
                rows={derived.teacherAvailability}
                days={dataset.days}
                periodsPerDay={dataset.periods.length}
              />
              <ListView
                entries={derived.entries}
                sections={dataset.sections}
                periods={dataset.periods}
                days={dataset.days}
              />
            </div>
          ) : view === "teachers" ? (
            <TeacherLoadTable
              rows={derived.teacherLoad}
              days={dataset.days}
              sections={dataset.sections}
            />
          ) : (
            <TimetableGrid
              sections={dataset.sections}
              periods={dataset.periods}
              days={dataset.days}
              entries={derived.entries}
              filtersActive={derived.filtersActive}
            />
          )}

          <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
            <Legend subjects={dataset.subjects} options={filterOptions} />
            <DayLegend days={dataset.days} />
          </div>
        </div>
      </main>
    </>
  );
}
