import { Suspense } from "react";

import { FilterBar } from "@/components/FilterBar";
import { ListView } from "@/components/ListView";
import { DayLegend, Legend, StatCards } from "@/components/StatCards";
import { TeacherLoadTable } from "@/components/TeacherLoadTable";
import { TimetableGrid } from "@/components/TimetableGrid";
import { ClassSwitcher, PrintButton, ThemeToggle, ViewTabs } from "@/components/Toolbar";
import {
  FilterBarSkeleton,
  GridSkeleton,
  StatsSkeleton,
  TableSkeleton,
} from "@/components/skeletons";
import { fetchTimetable, toSearchString } from "@/lib/api";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

async function Toolbar({ classId }: { classId: string }) {
  const data = await fetchTimetable(toSearchString({ class: classId }));

  return (
    <div className="flex items-center gap-2">
      <ClassSwitcher classes={data.classes} currentClassId={data.classId} />
      <span className="hidden text-xs text-fg-faint lg:inline">
        {data.sections.length} sections · {data.periods.length} periods
      </span>
    </div>
  );
}

async function Filters({ classId, search }: { classId: string; search: string }) {
  const data = await fetchTimetable(toSearchString({ class: classId }));
  const current = new URLSearchParams(search);
  const list = (key: string) => (current.get(key) ?? "").split(",").filter(Boolean);

  return (
    <FilterBar
      options={data.filterOptions}
      filters={{
        teacher: list("teacher"),
        subject: list("subject"),
        section: list("section"),
        group: list("group"),
        day: list("day").map(Number),
        period: list("period").map(Number),
        q: current.get("q") ?? "",
      }}
    />
  );
}

async function Content({ search, view }: { search: string; view: string }) {
  const data = await fetchTimetable(search);
  const { filters } = data;
  const filtersActive =
    filters.teacher.length > 0 ||
    filters.subject.length > 0 ||
    filters.section.length > 0 ||
    filters.group.length > 0 ||
    filters.day.length > 0 ||
    filters.period.length > 0 ||
    filters.q.length > 0;

  const errors = data.issues.filter((issue) => issue.level === "error");

  return (
    <div className="space-y-6">
      <StatCards stats={data.stats} filtersActive={filtersActive} />

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
        <ListView
          entries={data.entries}
          sections={data.sections}
          periods={data.periods}
          days={data.days}
        />
      ) : view === "teachers" ? (
        <TeacherLoadTable rows={data.teacherLoad} days={data.days} sections={data.sections} />
      ) : (
        <TimetableGrid
          sections={data.sections}
          periods={data.periods}
          days={data.days}
          entries={data.entries}
          filtersActive={filtersActive}
        />
      )}

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Legend subjects={data.subjects} options={data.filterOptions} />
        <DayLegend days={data.days} />
      </div>
    </div>
  );
}

function ContentSkeleton({ view }: { view: string }) {
  return (
    <div className="space-y-6">
      <StatsSkeleton />
      {view === "grid" ? <GridSkeleton /> : <TableSkeleton rows={10} />}
    </div>
  );
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const search = toSearchString(params);
  const classId = firstValue(params.class) ?? "6";
  const view = firstValue(params.view) ?? "grid";

  return (
    <div className="flex min-h-screen flex-col">
      <header className="no-print sticky top-0 z-30 border-b border-line bg-bg/80 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-[1600px] flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-fg text-bg">
              <svg
                viewBox="0 0 16 16"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                aria-hidden="true"
              >
                <rect x="2" y="3" width="12" height="11" rx="1.5" />
                <path d="M2 6.5h12M6 6.5v7.5M10 6.5v7.5" />
              </svg>
            </span>
            <div className="leading-tight">
              <h1 className="text-sm font-semibold">Time Table</h1>
              <p className="text-xs text-fg-faint">Session 2025-26</p>
            </div>
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Suspense fallback={<div className="skeleton h-9 w-32" aria-hidden="true" />}>
              <Toolbar classId={classId} />
            </Suspense>
            <ViewTabs current={view} />
            <PrintButton />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1600px] flex-1 space-y-6 px-4 py-6 sm:px-6">
        <Suspense key={`filters-${classId}`} fallback={<FilterBarSkeleton />}>
          <Filters classId={classId} search={search} />
        </Suspense>

        <Suspense key={`content-${search}`} fallback={<ContentSkeleton view={view} />}>
          <Content search={search} view={view} />
        </Suspense>
      </main>

      <footer className="no-print border-t border-line px-4 py-4 sm:px-6">
        <p className="mx-auto max-w-[1600px] text-xs text-fg-faint">
          Data lives in <code className="font-mono">data/</code> as JSON tables. Edit
          <code className="mx-1 font-mono">entries/&lt;classId&gt;.json</code>,
          <code className="mx-1 font-mono">teachers.json</code> or
          <code className="mx-1 font-mono">subjects.json</code> and reload.
        </p>
      </footer>
    </div>
  );
}
