import { describe, expect, it } from "bun:test";

import { findClashes } from "./clashes.js";
import { resolveDataset } from "./derive.js";
import type { Entry, RawDataset } from "./types.js";

const base: RawDataset = {
  school: { name: "", title: "Kaksha", session: "2025-26", updatedAt: "" },
  classes: [{ id: "6", name: "Class VI", shortName: "VI", active: true, entryCount: 0 }],
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
    subjectIds: ["sub_hindi", "sub_english"],
  },
  days: [
    { id: 1, name: "Monday", short: "Mon", order: 1 },
    { id: 2, name: "Tuesday", short: "Tue", order: 2 },
    { id: 3, name: "Wednesday", short: "Wed", order: 3 },
    { id: 4, name: "Thursday", short: "Thu", order: 4 },
  ],
  sections: [
    {
      id: "sec_6_a",
      classId: "6",
      name: "A",
      order: 0,
      electiveSubjectIds: [],
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
    { id: "sub_hindi", code: "Hindi", name: "Hindi", group: "core", color: "orange" },
    { id: "sub_english", code: "English", name: "English", group: "core", color: "blue" },
  ],
  teachers: [
    {
      id: "tch_anoop",
      name: "Anoop K.",
      shortName: "Anoop",
      department: null,
      active: true,
    },
    {
      id: "tch_surjeet",
      name: "Surjeet",
      shortName: "Surjeet",
      department: null,
      active: true,
    },
  ],
  entries: [],
};

function entry(overrides: Partial<Entry> & Pick<Entry, "id">): Entry {
  return {
    classId: "6",
    sectionId: "sec_6_a",
    periodId: 0,
    dayIds: [3, 4],
    assignments: [{ subjectId: "sub_hindi", teacherId: "tch_anoop" }],
    note: null,
    ...overrides,
  };
}

function clashesFor(entries: Entry[]) {
  return findClashes(resolveDataset({ ...base, entries }));
}

describe("findClashes", () => {
  it("finds two lectures booked on the same section, period and days", () => {
    const clashes = clashesFor([
      entry({ id: "ent_hindi" }),
      entry({
        id: "ent_english",
        assignments: [{ subjectId: "sub_english", teacherId: "tch_surjeet" }],
      }),
    ]);

    expect(clashes).toHaveLength(1);
    expect(clashes[0]?.kind).toBe("section");
    expect(clashes[0]?.sectionId).toBe("sec_6_a");
    expect(clashes[0]?.periodId).toBe(0);
    expect(clashes[0]?.dayIds).toEqual([3, 4]);
    expect(clashes[0]?.entryIds).toEqual(["ent_english", "ent_hindi"]);
  });

  it("reports only the overlapping days", () => {
    const clashes = clashesFor([
      entry({ id: "ent_hindi", dayIds: [1, 2, 3] }),
      entry({
        id: "ent_english",
        dayIds: [3, 4],
        assignments: [{ subjectId: "sub_english", teacherId: "tch_surjeet" }],
      }),
    ]);

    expect(clashes).toHaveLength(1);
    expect(clashes[0]?.dayIds).toEqual([3]);
  });

  it("stays quiet when the two lectures fall on different days", () => {
    expect(
      clashesFor([
        entry({ id: "ent_hindi", dayIds: [1, 2] }),
        entry({ id: "ent_english", dayIds: [3, 4] }),
      ]),
    ).toEqual([]);
  });

  it("stays quiet when the same slot is used by different sections", () => {
    expect(
      clashesFor([
        entry({ id: "ent_a" }),
        entry({
          id: "ent_b",
          sectionId: "sec_6_b",
          assignments: [{ subjectId: "sub_hindi", teacherId: "tch_surjeet" }],
        }),
      ]),
    ).toEqual([]);
  });

  it("catches a teacher booked in two sections at once", () => {
    const clashes = clashesFor([
      entry({ id: "ent_a" }),
      entry({ id: "ent_b", sectionId: "sec_6_b" }),
    ]);

    expect(clashes).toHaveLength(1);
    expect(clashes[0]?.kind).toBe("teacher");
    expect(clashes[0]?.teacherId).toBe("tch_anoop");
    expect(clashes[0]?.entryIds).toEqual(["ent_a", "ent_b"]);
  });

  it("catches a teacher listed twice inside one lecture", () => {
    const clashes = clashesFor([
      entry({
        id: "ent_double",
        assignments: [
          { subjectId: "sub_hindi", teacherId: "tch_anoop" },
          { subjectId: "sub_english", teacherId: "tch_anoop" },
        ],
      }),
    ]);

    expect(clashes).toHaveLength(1);
    expect(clashes[0]?.kind).toBe("teacher");
    expect(clashes[0]?.entryIds).toEqual(["ent_double"]);
  });

  it("does not repeat a section clash as a teacher clash", () => {
    const clashes = clashesFor([
      entry({ id: "ent_a" }),
      entry({
        id: "ent_b",
        assignments: [{ subjectId: "sub_english", teacherId: "tch_anoop" }],
      }),
    ]);

    expect(clashes.map((clash) => clash.kind)).toEqual(["section"]);
  });

  it("ignores lectures with no teacher", () => {
    expect(
      clashesFor([
        entry({
          id: "ent_a",
          assignments: [{ subjectId: "sub_hindi", teacherId: null }],
        }),
        entry({
          id: "ent_b",
          sectionId: "sec_6_b",
          assignments: [{ subjectId: "sub_hindi", teacherId: null }],
        }),
      ]),
    ).toEqual([]);
  });

  it("sorts by period and section", () => {
    const clashes = clashesFor([
      entry({ id: "ent_p1_a", periodId: 1, sectionId: "sec_6_b" }),
      entry({
        id: "ent_p1_b",
        periodId: 1,
        sectionId: "sec_6_b",
        assignments: [{ subjectId: "sub_english", teacherId: "tch_surjeet" }],
      }),
      entry({ id: "ent_p0_a" }),
      entry({
        id: "ent_p0_b",
        assignments: [{ subjectId: "sub_english", teacherId: "tch_surjeet" }],
      }),
    ]);

    expect(clashes.map((clash) => clash.periodId)).toEqual([0, 1]);
  });
});

describe("elective blocks", () => {
  const withElectives = (electiveSubjectIds: string[]) => ({
    ...base,
    sections: base.sections.map((section) => ({ ...section, electiveSubjectIds })),
  });

  function clashesWithElectives(electiveSubjectIds: string[], entries: Entry[]) {
    return findClashes(resolveDataset({ ...withElectives(electiveSubjectIds), entries }));
  }

  const acrossSections = [
    entry({ id: "ent_a", sectionId: "sec_6_a" }),
    entry({ id: "ent_b", sectionId: "sec_6_b" }),
  ];

  it("treats one teacher taking one elective across sections as a block", () => {
    const clashes = clashesWithElectives(["sub_hindi"], acrossSections);

    expect(clashes).toHaveLength(1);
    expect(clashes[0]?.kind).toBe("elective");
    expect(clashes[0]?.teacherId).toBe("tch_anoop");
  });

  it("still reports it when the subject is not an elective of both sections", () => {
    const clashes = findClashes(
      resolveDataset({
        ...base,
        sections: [
          { ...base.sections[0]!, electiveSubjectIds: ["sub_hindi"] },
          { ...base.sections[1]!, electiveSubjectIds: [] },
        ],
        entries: acrossSections,
      }),
    );

    expect(clashes).toHaveLength(1);
    expect(clashes[0]?.kind).toBe("teacher");
  });

  it("still reports a teacher taking two different subjects at once", () => {
    const clashes = clashesWithElectives(
      ["sub_hindi", "sub_english"],
      [
        entry({ id: "ent_a", sectionId: "sec_6_a" }),
        entry({
          id: "ent_b",
          sectionId: "sec_6_b",
          assignments: [{ subjectId: "sub_english", teacherId: "tch_anoop" }],
        }),
      ],
    );

    expect(clashes).toHaveLength(1);
    expect(clashes[0]?.kind).toBe("teacher");
  });

  it("leaves section overlaps alone whatever the electives say", () => {
    const clashes = clashesWithElectives(
      ["sub_hindi", "sub_english"],
      [
        entry({ id: "ent_a" }),
        entry({
          id: "ent_b",
          assignments: [{ subjectId: "sub_english", teacherId: "tch_surjeet" }],
        }),
      ],
    );

    expect(clashes.map((clash) => clash.kind)).toEqual(["section"]);
  });
});
