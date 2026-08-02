import { describe, expect, it } from "bun:test";

import { resolveClassId, sliceClass, summarizeClasses } from "./database.js";
import type { Database } from "./types.js";

const periods = [
  { id: 1, name: "1", label: "1" },
  { id: 2, name: "2", label: "2" },
];

const db: Database = {
  revision: 7,
  school: { name: "", title: "Kaksha", session: "2025-26", updatedAt: "" },
  days: [
    { id: 2, name: "Tuesday", short: "Tue", order: 2 },
    { id: 1, name: "Monday", short: "Mon", order: 1 },
  ],
  subjects: [
    { id: "sub_maths", code: "MA", name: "Mathematics", group: "core", color: "blue" },
  ],
  teachers: [
    { id: "tch_renu", name: "Renu", shortName: "Renu", department: null, active: true },
  ],
  classes: [
    {
      id: "7",
      name: "Class VII",
      shortName: "VII",
      order: 1,
      active: true,
      periods,
      subjectIds: ["sub_maths"],
    },
    {
      id: "6",
      name: "Class VI",
      shortName: "VI",
      order: 0,
      active: false,
      periods,
      subjectIds: ["sub_maths"],
    },
  ],
  sections: [
    {
      id: "sec_6_b",
      classId: "6",
      name: "B",
      order: 1,
      electiveSubjectIds: [],
      note: null,
    },
    {
      id: "sec_6_a",
      classId: "6",
      name: "A",
      order: 0,
      electiveSubjectIds: [],
      note: null,
    },
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
      id: "ent_6_one",
      classId: "6",
      sectionId: "sec_6_a",
      periodId: 1,
      dayIds: [1],
      assignments: [{ subjectId: "sub_maths", teacherId: "tch_renu" }],
      note: null,
    },
    {
      id: "ent_6_two",
      classId: "6",
      sectionId: "sec_6_b",
      periodId: 2,
      dayIds: [2],
      assignments: [{ subjectId: "sub_maths", teacherId: "tch_renu" }],
      note: null,
    },
    {
      id: "ent_7_one",
      classId: "7",
      sectionId: "sec_7_a",
      periodId: 1,
      dayIds: [1],
      assignments: [{ subjectId: "sub_maths", teacherId: null }],
      note: null,
    },
  ],
  notes: [],
};

describe("resolveClassId", () => {
  it("honours the requested class", () => {
    expect(resolveClassId(db, "6")).toBe("6");
  });

  it("falls back to the active class when the request is unknown", () => {
    expect(resolveClassId(db, "nope")).toBe("7");
  });

  it("falls back to the lowest ordered class when none is active", () => {
    const inactive = {
      ...db,
      classes: db.classes.map((record) => ({ ...record, active: false })),
    };
    expect(resolveClassId(inactive, null)).toBe("6");
  });

  it("returns null for an empty database", () => {
    expect(resolveClassId({ ...db, classes: [] }, "6")).toBeNull();
  });
});

describe("summarizeClasses", () => {
  it("counts entries per class and orders by the class order", () => {
    expect(summarizeClasses(db)).toEqual([
      { id: "6", name: "Class VI", shortName: "VI", active: false, entryCount: 2 },
      { id: "7", name: "Class VII", shortName: "VII", active: true, entryCount: 1 },
    ]);
  });

  it("reports zero for a class with no entries", () => {
    const counts = summarizeClasses({ ...db, entries: [] });
    expect(counts.map((item) => item.entryCount)).toEqual([0, 0]);
  });
});

describe("sliceClass", () => {
  it("keeps only the sections and entries of the chosen class", () => {
    const raw = sliceClass(db, "6");

    expect(raw?.currentClass.id).toBe("6");
    expect(raw?.sections.map((section) => section.id)).toEqual(["sec_6_a", "sec_6_b"]);
    expect(raw?.entries.map((entry) => entry.id)).toEqual(["ent_6_one", "ent_6_two"]);
  });

  it("keeps the whole catalogue so other classes still resolve", () => {
    const raw = sliceClass(db, "6");

    expect(raw?.subjects).toEqual(db.subjects);
    expect(raw?.teachers).toEqual(db.teachers);
    expect(raw?.classes.map((item) => item.id)).toEqual(["6", "7"]);
  });

  it("sorts days by their order", () => {
    expect(sliceClass(db, "6")?.days.map((day) => day.id)).toEqual([1, 2]);
  });

  it("returns null when there is nothing to show", () => {
    expect(sliceClass({ ...db, classes: [] }, "6")).toBeNull();
  });
});
