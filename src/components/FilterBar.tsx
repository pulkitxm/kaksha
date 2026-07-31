"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { swatch } from "@/lib/colors";
import type { FilterOptions, Filters } from "@/lib/types";

import { MultiSelect, type Option } from "./MultiSelect";

type Props = {
  options: FilterOptions;
  filters: Filters;
};

type ChipDescriptor = {
  key: keyof Omit<Filters, "q">;
  value: string;
  label: string;
};

export function FilterBar({ options, filters }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(filters.q);

  useEffect(() => {
    setSearch(filters.q);
  }, [filters.q]);

  function push(mutate: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    const query = params.toString();
    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    });
  }

  function setList(key: string, values: string[]) {
    push((params) => {
      params.delete(key);
      if (values.length) params.set(key, values.join(","));
    });
  }

  useEffect(() => {
    const current = searchParams.get("q") ?? "";
    if (search === current) return;
    const timer = setTimeout(() => {
      push((params) => {
        if (search.trim()) params.set("q", search.trim());
        else params.delete("q");
      });
    }, 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const teacherOptions: Option[] = options.teachers.map((teacher) => ({
    value: teacher.id,
    label: teacher.name,
    hint: String(teacher.lectures),
  }));

  const subjectOptions: Option[] = options.subjects.map((subject) => ({
    value: subject.id,
    label: subject.name === subject.code ? subject.code : `${subject.code} · ${subject.name}`,
    hint: String(subject.lectures),
    dotClass: swatch(subject.color).dot,
  }));

  const sectionOptions: Option[] = options.sections.map((section) => ({
    value: section.id,
    label: `Section ${section.name}`,
  }));

  const dayOptions: Option[] = options.days.map((day) => ({
    value: String(day.id),
    label: day.name,
    hint: String(day.id),
  }));

  const periodOptions: Option[] = options.periods.map((period) => ({
    value: String(period.id),
    label:
      period.name && period.name !== period.label
        ? `Period ${period.label} · ${period.name}`
        : `Period ${period.label}`,
  }));

  const groupOptions: Option[] = options.groups.map((group) => ({
    value: group,
    label: group.charAt(0).toUpperCase() + group.slice(1),
  }));

  const chips: ChipDescriptor[] = [
    ...filters.teacher.map((id) => ({
      key: "teacher" as const,
      value: id,
      label: options.teachers.find((t) => t.id === id)?.name ?? id,
    })),
    ...filters.subject.map((id) => ({
      key: "subject" as const,
      value: id,
      label: options.subjects.find((s) => s.id === id)?.code ?? id,
    })),
    ...filters.section.map((id) => ({
      key: "section" as const,
      value: id,
      label: `Section ${options.sections.find((s) => s.id === id)?.name ?? id}`,
    })),
    ...filters.day.map((id) => ({
      key: "day" as const,
      value: String(id),
      label: options.days.find((d) => d.id === id)?.name ?? `Day ${id}`,
    })),
    ...filters.period.map((id) => {
      const period = options.periods.find((p) => p.id === id);
      return {
        key: "period" as const,
        value: String(id),
        label:
          period?.name && period.name !== period.label
            ? `${period.label} · ${period.name}`
            : `Period ${id}`,
      };
    }),
    ...filters.group.map((group) => ({
      key: "group" as const,
      value: group,
      label: group,
    })),
  ];

  const hasAny = chips.length > 0 || filters.q.length > 0;

  function removeChip(chip: ChipDescriptor) {
    const current = (filters[chip.key] as (string | number)[]).map(String);
    setList(
      chip.key,
      current.filter((value) => value !== chip.value),
    );
  }

  function clearAll() {
    setSearch("");
    push((params) => {
      for (const key of ["teacher", "subject", "section", "day", "period", "group", "q"]) {
        params.delete(key);
      }
    });
  }

  return (
    <div className="no-print space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-72">
          <svg
            viewBox="0 0 16 16"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-faint"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            aria-hidden="true"
          >
            <circle cx="7" cy="7" r="4.5" />
            <path d="M10.5 10.5L14 14" strokeLinecap="round" />
          </svg>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search teacher, subject, note"
            aria-label="Search timetable"
            className="h-9 w-full rounded-lg border border-line bg-panel pl-9 pr-8 text-sm outline-none transition-colors placeholder:text-fg-faint hover:border-line-strong focus:border-line-strong"
          />
          {search ? (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded text-fg-faint hover:bg-panel-hover hover:text-fg"
            >
              <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
              </svg>
            </button>
          ) : null}
        </div>

        <MultiSelect
          label="Teacher"
          options={teacherOptions}
          selected={filters.teacher}
          onChange={(next) => setList("teacher", next)}
          searchable
        />
        <MultiSelect
          label="Subject"
          options={subjectOptions}
          selected={filters.subject}
          onChange={(next) => setList("subject", next)}
          searchable
        />
        <MultiSelect
          label="Section"
          options={sectionOptions}
          selected={filters.section}
          onChange={(next) => setList("section", next)}
        />
        <MultiSelect
          label="Day"
          options={dayOptions}
          selected={filters.day.map(String)}
          onChange={(next) => setList("day", next)}
        />
        <MultiSelect
          label="Period"
          options={periodOptions}
          selected={filters.period.map(String)}
          onChange={(next) => setList("period", next)}
        />
        {groupOptions.length > 1 ? (
          <MultiSelect
            label="Type"
            options={groupOptions}
            selected={filters.group}
            onChange={(next) => setList("group", next)}
          />
        ) : null}

        {isPending ? (
          <span
            className="h-4 w-4 animate-spin rounded-full border-2 border-line-strong border-t-fg"
            aria-label="Applying filters"
          />
        ) : null}
      </div>

      {hasAny ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {filters.q ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-panel px-2.5 py-1 text-xs text-fg-muted">
              <span className="text-fg-faint">search</span>
              <span className="text-fg">{filters.q}</span>
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Remove search filter"
                className="text-fg-faint hover:text-fg"
              >
                <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
                </svg>
              </button>
            </span>
          ) : null}

          {chips.map((chip) => (
            <span
              key={`${chip.key}-${chip.value}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-panel px-2.5 py-1 text-xs text-fg"
            >
              <span className="text-fg-faint">{chip.key}</span>
              {chip.label}
              <button
                type="button"
                onClick={() => removeChip(chip)}
                aria-label={`Remove ${chip.label} filter`}
                className="text-fg-faint hover:text-fg"
              >
                <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
                </svg>
              </button>
            </span>
          ))}

          <button
            type="button"
            onClick={clearAll}
            className="rounded-full px-2.5 py-1 text-xs text-fg-muted underline-offset-2 hover:text-fg hover:underline"
          >
            Clear all
          </button>
        </div>
      ) : null}
    </div>
  );
}
