import type { Day } from "./types";

export function formatDayRange(days: number[]): string {
  if (days.length === 0) return "";
  const sorted = [...days].sort((a, b) => a - b);
  const runs: number[][] = [];

  for (const day of sorted) {
    const last = runs[runs.length - 1];
    if (last && day === last[last.length - 1] + 1) last.push(day);
    else runs.push([day]);
  }

  return runs
    .map((run) => (run.length >= 3 ? `${run[0]}-${run[run.length - 1]}` : run.join(",")))
    .join(", ");
}

export function dayNames(days: number[], allDays: Day[]): string {
  const byId = new Map(allDays.map((d) => [d.id, d.short]));
  return [...days]
    .sort((a, b) => a - b)
    .map((id) => byId.get(id) ?? String(id))
    .join(", ");
}

export function isFullWeek(days: number[], allDays: Day[]): boolean {
  return days.length === allDays.length && allDays.length > 0;
}

export function pluralize(count: number, singular: string, plural?: string): string {
  return `${count} ${count === 1 ? singular : (plural ?? `${singular}s`)}`;
}
