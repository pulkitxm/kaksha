import { NextResponse } from "next/server";

import { colorForKey, isColorToken } from "@/lib/colors";
import { getClasses, getEntries, getSubjects } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const classFilter = params.get("class");

  const [subjects, classes] = await Promise.all([getSubjects(), getClasses()]);
  const targetClasses = classFilter
    ? classes.filter((c) => c.id === classFilter)
    : classes;

  const entryLists = await Promise.all(targetClasses.map((c) => getEntries(c.id)));
  const lectures = new Map<string, number>();

  entryLists.flat().forEach((entry) => {
    for (const assignment of entry.assignments) {
      lectures.set(
        assignment.subjectId,
        (lectures.get(assignment.subjectId) ?? 0) + entry.dayIds.length,
      );
    }
  });

  const rows = subjects
    .filter((subject) =>
      classFilter
        ? targetClasses.some((c) => c.subjectIds.includes(subject.id)) ||
          lectures.has(subject.id)
        : true,
    )
    .map((subject) => ({
      ...subject,
      color: isColorToken(subject.color) ? subject.color : colorForKey(subject.id),
      lectures: lectures.get(subject.id) ?? 0,
    }))
    .sort((a, b) => b.lectures - a.lectures || a.code.localeCompare(b.code));

  return NextResponse.json(
    { subjects: rows },
    { headers: { "Cache-Control": "no-store" } },
  );
}
