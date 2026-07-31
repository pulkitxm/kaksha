import { NextResponse } from "next/server";

import { getClasses } from "@/lib/db";
import { EMPTY_FILTERS, getTimetable } from "@/lib/query";
import type { IntegrityIssue } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const classes = await getClasses();
  const perClass = await Promise.all(
    classes.map(async (record) => {
      const data = await getTimetable(record.id, EMPTY_FILTERS);
      return { classId: record.id, issues: data.issues };
    }),
  );

  const issues: (IntegrityIssue & { classId: string })[] = perClass.flatMap((entry) =>
    entry.issues.map((issue) => ({ ...issue, classId: entry.classId })),
  );

  return NextResponse.json(
    {
      ok: issues.every((issue) => issue.level !== "error"),
      errors: issues.filter((issue) => issue.level === "error").length,
      warnings: issues.filter((issue) => issue.level === "warning").length,
      issues,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
