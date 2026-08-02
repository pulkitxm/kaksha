import { describe, expect, it } from "bun:test";

import { EMPTY_FILTERS, resolveDataset } from "./derive.js";
import { buildTeacherShareModel } from "./share.js";
import type { Entry, Filters, Period, RawDataset, Section } from "./types.js";

const school = { name: "", title: "Kaksha", session: "2025-26", updatedAt: "" };

const days = [
  { id: 1, name: "Monday", short: "Mon", order: 1 },
  { id: 2, name: "Tuesday", short: "Tue", order: 2 },
];

const subjects = [
  { id: "sub_science", code: "SE", name: "Science", group: "core", color: "violet" },
  { id: "sub_maths", code: "MA", name: "Mathematics", group: "core", color: "blue" },
] as const;

const teachers = [
  {
    id: "tch_shivani",
    name: "Shivani",
    shortName: "Shivani",
    department: null,
    active: true,
  },
  { id: "tch_renu", name: "Renu", shortName: "Renu", department: null, active: true },
];

function makeRaw(input: {
  id: string;
  name: string;
  shortName: string;
  periods: Period[];
  sections: Section[];
  entries: Entry[];
}): RawDataset {
  return {
    school,
    classes: [],
    currentClass: {
      id: input.id,
      name: input.name,
      shortName: input.shortName,
      order: 0,
      active: true,
      periods: input.periods,
      subjectIds: subjects.map((subject) => subject.id),
    },
    days,
    sections: input.sections,
    subjects: [...subjects],
    teachers,
    entries: input.entries,
  };
}

const classSix = resolveDataset(
  makeRaw({
    id: "6",
    name: "Class VI",
    shortName: "VI",
    periods: [{ id: 4, name: "4", label: "4" }],
    sections: [
      {
        id: "sec_6_c",
        classId: "6",
        name: "C",
        order: 0,
        electiveSubjectIds: [],
        note: null,
      },
    ],
    entries: [
      {
        id: "ent_6_1",
        classId: "6",
        sectionId: "sec_6_c",
        periodId: 4,
        dayIds: [1],
        assignments: [{ subjectId: "sub_science", teacherId: "tch_shivani" }],
        note: null,
      },
      {
        id: "ent_6_2",
        classId: "6",
        sectionId: "sec_6_c",
        periodId: 4,
        dayIds: [2],
        assignments: [{ subjectId: "sub_maths", teacherId: "tch_renu" }],
        note: null,
      },
    ],
  }),
);

const classSeven = resolveDataset(
  makeRaw({
    id: "7",
    name: "Class VII",
    shortName: "VII",
    periods: [
      { id: 4, name: "4", label: "4" },
      { id: 9, name: "Games", label: "9" },
    ],
    sections: [
      {
        id: "sec_7_a",
        classId: "7",
        name: "A",
        order: 0,
        electiveSubjectIds: [],
        note: null,
      },
    ],
    entries: [
      {
        id: "ent_7_1",
        classId: "7",
        sectionId: "sec_7_a",
        periodId: 4,
        dayIds: [1],
        assignments: [{ subjectId: "sub_science", teacherId: "tch_shivani" }],
        note: null,
      },
      {
        id: "ent_7_2",
        classId: "7",
        sectionId: "sec_7_a",
        periodId: 9,
        dayIds: [2],
        assignments: [{ subjectId: "sub_science", teacherId: "tch_shivani" }],
        note: null,
      },
    ],
  }),
);

function withFilters(overrides: Partial<Filters>): Filters {
  return { ...EMPTY_FILTERS, ...overrides };
}

describe("buildTeacherShareModel", () => {
  it("merges the teacher's lectures from every class", () => {
    const model = buildTeacherShareModel(
      [classSix, classSeven],
      "tch_shivani",
      EMPTY_FILTERS,
    );
    expect(model.title).toBe("Shivani");
    expect(model.subtitle).toBe("Classes VI, VII · 2025-26");
    expect(model.lectures).toBe(3);
    expect(model.rows.map((row) => row.periodId)).toEqual([4, 9]);
    expect(model.rows[0]?.byDay[1]?.map((cell) => cell.sectionName)).toEqual([
      "VI-C",
      "VII-A",
    ]);
  });

  it("keeps other teachers' lectures out of the card", () => {
    const model = buildTeacherShareModel(
      [classSix, classSeven],
      "tch_shivani",
      EMPTY_FILTERS,
    );
    const codes = model.rows.flatMap((row) =>
      Object.values(row.byDay).flatMap((cells) => cells.map((cell) => cell.subjectCode)),
    );
    expect(codes).toEqual(["SE", "SE", "SE"]);
  });

  it("names a single matching class in the subtitle", () => {
    const model = buildTeacherShareModel(
      [classSix, classSeven],
      "tch_renu",
      EMPTY_FILTERS,
    );
    expect(model.subtitle).toBe("Class VI · 2025-26");
    expect(model.lectures).toBe(1);
    expect(model.rows[0]?.byDay[2]?.[0]?.sectionName).toBe("VI-C");
  });

  it("respects the day filter across classes", () => {
    const model = buildTeacherShareModel(
      [classSix, classSeven],
      "tch_shivani",
      withFilters({ day: [1] }),
    );
    expect(model.days.map((day) => day.id)).toEqual([1]);
    expect(model.lectures).toBe(2);
    expect(model.rows.find((row) => row.periodId === 9)?.byDay[2]).toBeUndefined();
  });

  it("labels periods that only exist in one class", () => {
    const model = buildTeacherShareModel(
      [classSix, classSeven],
      "tch_shivani",
      EMPTY_FILTERS,
    );
    const games = model.rows.find((row) => row.periodId === 9);
    expect(games?.periodLabel).toBe("9");
    expect(games?.periodName).toBe("Games");
  });

  it("returns an empty model when no datasets are available", () => {
    const model = buildTeacherShareModel([], "tch_shivani", EMPTY_FILTERS);
    expect(model.rows).toEqual([]);
    expect(model.lectures).toBe(0);
  });
});
