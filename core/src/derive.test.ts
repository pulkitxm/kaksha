import { describe, expect, it } from "vitest";

import {
  applyFilters,
  EMPTY_FILTERS,
  hasActiveFilters,
  resolveDataset,
} from "./derive.js";
import type { Filters, RawDataset } from "./types.js";

const raw: RawDataset = {
  school: { name: "", title: "Kaksha", session: "2025-26", updatedAt: "" },
  classes: [{ id: "6", name: "Class VI", shortName: "VI", active: true, entryCount: 3 }],
  currentClass: {
    id: "6",
    name: "Class VI",
    shortName: "VI",
    order: 0,
    active: true,
    periods: [
      { id: 0, name: "Nipun", label: "0" },
      { id: 1, name: "1", label: "1" },
    ],
    subjectIds: ["sub_english", "sub_maths"],
  },
  days: [
    { id: 1, name: "Monday", short: "Mon", order: 1 },
    { id: 2, name: "Tuesday", short: "Tue", order: 2 },
  ],
  sections: [
    {
      id: "sec_6_a",
      classId: "6",
      name: "A",
      order: 0,
      electiveSubjectIds: ["sub_maths"],
      note: null,
    },
    {
      id: "sec_6_b",
      classId: "6",
      name: "B",
      order: 1,
      electiveSubjectIds: [],
      note: null,
    },
  ],
  subjects: [
    { id: "sub_english", code: "English", name: "English", group: "core", color: "blue" },
    {
      id: "sub_maths",
      code: "Maths",
      name: "Mathematics",
      group: "core",
      color: "violet",
    },
  ],
  teachers: [
    { id: "tch_renu", name: "Renu", shortName: "Renu", department: null, active: true },
    { id: "tch_asha", name: "Asha", shortName: "Asha", department: null, active: true },
  ],
  entries: [
    {
      id: "ent_1",
      classId: "6",
      sectionId: "sec_6_a",
      periodId: 0,
      dayIds: [1, 2],
      assignments: [{ subjectId: "sub_english", teacherId: "tch_renu" }],
      note: null,
    },
    {
      id: "ent_2",
      classId: "6",
      sectionId: "sec_6_a",
      periodId: 1,
      dayIds: [1],
      assignments: [{ subjectId: "sub_maths", teacherId: "tch_asha" }],
      note: null,
    },
    {
      id: "ent_3",
      classId: "6",
      sectionId: "sec_6_b",
      periodId: 0,
      dayIds: [1, 2],
      assignments: [{ subjectId: "sub_maths", teacherId: "tch_asha" }],
      note: null,
    },
  ],
};

const dataset = resolveDataset(raw);

function withFilters(overrides: Partial<Filters>): Filters {
  return { ...EMPTY_FILTERS, ...overrides };
}

describe("resolveDataset", () => {
  it("resolves assignments to subject and teacher records", () => {
    const entry = dataset.entries[0];
    expect(entry?.assignments[0]?.subject.code).toBe("English");
    expect(entry?.assignments[0]?.teacher?.name).toBe("Renu");
  });

  it("resolves section electives to subjects", () => {
    expect(dataset.sections[0]?.electives.map((s) => s.code)).toEqual(["Maths"]);
  });

  it("reports no issues for a consistent dataset", () => {
    expect(dataset.issues).toEqual([]);
  });

  it("flags an entry that points at a missing section", () => {
    const broken = resolveDataset({
      ...raw,
      entries: [{ ...raw.entries[0]!, sectionId: "sec_6_z" }],
    });
    expect(broken.issues.some((issue) => issue.level === "error")).toBe(true);
  });

  it("substitutes a placeholder for an unknown subject", () => {
    const broken = resolveDataset({
      ...raw,
      entries: [
        {
          ...raw.entries[0]!,
          assignments: [{ subjectId: "sub_ghost", teacherId: "tch_renu" }],
        },
      ],
    });
    expect(broken.issues.some((issue) => issue.level === "warning")).toBe(true);
    expect(broken.entries[0]?.assignments[0]?.subject.code).toBe("Ghost");
  });
});

describe("applyFilters", () => {
  it("counts every lecture when nothing is filtered", () => {
    const derived = applyFilters(dataset, EMPTY_FILTERS);
    expect(derived.stats.matchedEntries).toBe(3);
    expect(derived.stats.matchedLectures).toBe(5);
    expect(derived.filtersActive).toBe(false);
  });

  it("filters by teacher and counts only their lectures", () => {
    const derived = applyFilters(dataset, withFilters({ teacher: ["tch_asha"] }));
    expect(derived.stats.matchedEntries).toBe(2);
    expect(derived.stats.matchedLectures).toBe(3);
  });

  it("narrows lecture counts to the selected day", () => {
    const derived = applyFilters(dataset, withFilters({ day: [2] }));
    expect(derived.stats.matchedEntries).toBe(2);
    expect(derived.stats.matchedLectures).toBe(2);
  });

  it("matches free text against teacher names", () => {
    const derived = applyFilters(dataset, withFilters({ q: "renu" }));
    expect(derived.stats.matchedEntries).toBe(1);
  });

  it("computes free periods from every entry, not just matches", () => {
    const derived = applyFilters(dataset, withFilters({ teacher: ["tch_renu"] }));
    const renu = derived.teacherAvailability.find((row) => row.teacherId === "tch_renu");
    expect(renu?.totalBusy).toBe(2);
    expect(renu?.totalFree).toBe(2);
  });

  it("keeps teacher load in descending order", () => {
    const derived = applyFilters(dataset, EMPTY_FILTERS);
    expect(derived.teacherLoad[0]?.teacher).toBe("Asha");
    expect(derived.teacherLoad[0]?.lectures).toBe(3);
  });
});

describe("hasActiveFilters", () => {
  it("is false for the empty filter set", () => {
    expect(hasActiveFilters(EMPTY_FILTERS)).toBe(false);
  });

  it("is true when any dimension is set", () => {
    expect(hasActiveFilters(withFilters({ period: [0] }))).toBe(true);
  });
});
