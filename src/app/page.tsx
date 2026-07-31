import { Suspense } from "react";

import { Brand } from "@/components/Brand";
import { TimetableApp } from "@/components/TimetableApp";
import {
  FilterBarSkeleton,
  GridSkeleton,
  StatsSkeleton,
  TableSkeleton,
} from "@/components/skeletons";
import { isView } from "@/lib/derive";
import { getDataset, parseClassId, parseFilters } from "@/lib/query";
import type { TimetableView } from "@/lib/types";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

async function Workspace({
  params,
  view,
}: {
  params: SearchParams;
  view: TimetableView;
}) {
  const dataset = await getDataset(parseClassId(params));

  return (
    <TimetableApp
      key={dataset.classId}
      dataset={dataset}
      initialFilters={parseFilters(params)}
      initialView={view}
    />
  );
}

function WorkspaceSkeleton({ view }: { view: TimetableView }) {
  return (
    <>
      <header className="no-print sticky top-0 z-30 border-b border-line bg-bg/80 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-[1600px] flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
          <Brand />
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <div className="skeleton h-9 w-32" aria-hidden="true" />
            <div className="skeleton h-9 w-44" aria-hidden="true" />
            <div className="skeleton h-9 w-20" aria-hidden="true" />
            <div className="skeleton h-9 w-9" aria-hidden="true" />
            <div className="skeleton h-9 w-9" aria-hidden="true" />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1600px] flex-1 space-y-6 px-4 py-6 sm:px-6">
        <FilterBarSkeleton />
        <StatsSkeleton />
        {view === "grid" ? <GridSkeleton /> : <TableSkeleton rows={10} />}
      </main>
    </>
  );
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const viewParam = firstValue(params.view) ?? "grid";
  const view: TimetableView = isView(viewParam) ? viewParam : "grid";
  const classId = firstValue(params.class) ?? "";

  return (
    <div className="flex min-h-screen flex-col">
      <Suspense key={`shell-${classId}`} fallback={<WorkspaceSkeleton view={view} />}>
        <Workspace params={params} view={view} />
      </Suspense>

      <footer className="no-print border-t border-line px-4 py-4 sm:px-6">
        <p className="mx-auto max-w-[1600px] text-xs break-words text-fg-faint">
          Served from Postgres via Drizzle. Filters run in the browser, so only the first
          load and a class change hit the server.
        </p>
      </footer>
    </div>
  );
}
