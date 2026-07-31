import { NextResponse } from "next/server";

import { getTimetable, parseClassId, parseFilters } from "@/lib/query";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;

  try {
    const data = await getTimetable(parseClassId(params), parseFilters(params));
    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load timetable" },
      { status: 500 },
    );
  }
}
