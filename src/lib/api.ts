import "server-only";

import { headers } from "next/headers";

import type { TimetableResponse } from "./types";

async function baseUrl(): Promise<string> {
  const headerList = await headers();
  const host =
    headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "localhost:3000";
  const proto =
    headerList.get("x-forwarded-proto") ??
    (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
  return `${proto}://${host}`;
}

export function toSearchString(
  params: Record<string, string | string[] | undefined>,
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    for (const item of Array.isArray(value) ? value : [value]) {
      if (item) search.append(key, item);
    }
  }
  return search.toString();
}

export async function fetchTimetable(search: string): Promise<TimetableResponse> {
  const url = `${await baseUrl()}/api/timetable${search ? `?${search}` : ""}`;
  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Timetable API failed (${response.status}): ${body.slice(0, 200)}`);
  }

  return (await response.json()) as TimetableResponse;
}
