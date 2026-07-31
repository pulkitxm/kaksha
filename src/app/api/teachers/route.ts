import { NextResponse } from "next/server";

import { getClasses, getEntries, getSubjects, getTeachers } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const classFilter = params.get("class");

  const [teachers, subjects, classes] = await Promise.all([
    getTeachers(),
    getSubjects(),
    getClasses(),
  ]);

  const targetClasses = classFilter
    ? classes.filter((c) => c.id === classFilter)
    : classes;

  const entryLists = await Promise.all(targetClasses.map((c) => getEntries(c.id)));
  const subjectById = new Map(subjects.map((s) => [s.id, s]));

  const load = new Map<
    string,
    { lectures: number; subjectIds: Set<string>; classIds: Set<string> }
  >();

  entryLists.flat().forEach((entry) => {
    for (const assignment of entry.assignments) {
      if (!assignment.teacherId) continue;
      const current = load.get(assignment.teacherId) ?? {
        lectures: 0,
        subjectIds: new Set<string>(),
        classIds: new Set<string>(),
      };
      current.lectures += entry.dayIds.length;
      current.subjectIds.add(assignment.subjectId);
      current.classIds.add(entry.classId);
      load.set(assignment.teacherId, current);
    }
  });

  const rows = teachers
    .map((teacher) => {
      const stats = load.get(teacher.id);
      return {
        ...teacher,
        lectures: stats?.lectures ?? 0,
        classIds: [...(stats?.classIds ?? [])],
        subjects: [...(stats?.subjectIds ?? [])].map((id) => ({
          id,
          code: subjectById.get(id)?.code ?? id,
        })),
      };
    })
    .sort((a, b) => b.lectures - a.lectures || a.name.localeCompare(b.name));

  return NextResponse.json(
    { teachers: rows },
    { headers: { "Cache-Control": "no-store" } },
  );
}
