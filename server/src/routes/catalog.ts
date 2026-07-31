import { Router } from "express";
import { colorForKey, isColorToken } from "@kaksha/core";

import {
  getClasses,
  getEntries,
  getSections,
  getSubjects,
  getTeachers,
} from "../db/queries.js";
import { asHandler } from "../http.js";

export const catalogRouter: Router = Router();

catalogRouter.get(
  "/classes",
  asHandler(async (_request, response) => {
    const classes = await getClasses();

    const rows = await Promise.all(
      classes.map(async (record) => {
        const [sections, entries] = await Promise.all([
          getSections(record.id),
          getEntries(record.id),
        ]);
        return {
          id: record.id,
          name: record.name,
          shortName: record.shortName,
          active: record.active,
          periodCount: record.periods.length,
          sectionCount: sections.length,
          entryCount: entries.length,
          subjectCount: record.subjectIds.length,
        };
      }),
    );

    response.json({ classes: rows });
  }),
);

catalogRouter.get(
  "/teachers",
  asHandler(async (request, response) => {
    const classFilter =
      typeof request.query.class === "string" ? request.query.class : null;

    const [teachers, subjects, classes] = await Promise.all([
      getTeachers(),
      getSubjects(),
      getClasses(),
    ]);

    const targets = classFilter
      ? classes.filter((record) => record.id === classFilter)
      : classes;
    const entryLists = await Promise.all(targets.map((record) => getEntries(record.id)));
    const subjectById = new Map(subjects.map((subject) => [subject.id, subject]));

    const load = new Map<
      string,
      { lectures: number; subjectIds: Set<string>; classIds: Set<string> }
    >();

    for (const entry of entryLists.flat()) {
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
    }

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

    response.json({ teachers: rows });
  }),
);

catalogRouter.get(
  "/subjects",
  asHandler(async (request, response) => {
    const classFilter =
      typeof request.query.class === "string" ? request.query.class : null;

    const [subjects, classes] = await Promise.all([getSubjects(), getClasses()]);
    const targets = classFilter
      ? classes.filter((record) => record.id === classFilter)
      : classes;
    const entryLists = await Promise.all(targets.map((record) => getEntries(record.id)));

    const lectures = new Map<string, number>();
    for (const entry of entryLists.flat()) {
      for (const assignment of entry.assignments) {
        lectures.set(
          assignment.subjectId,
          (lectures.get(assignment.subjectId) ?? 0) + entry.dayIds.length,
        );
      }
    }

    const rows = subjects
      .map((subject) => ({
        ...subject,
        color: isColorToken(subject.color) ? subject.color : colorForKey(subject.id),
        lectures: lectures.get(subject.id) ?? 0,
      }))
      .sort((a, b) => b.lectures - a.lectures || a.code.localeCompare(b.code));

    response.json({ subjects: rows });
  }),
);
