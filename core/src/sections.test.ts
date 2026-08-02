import { describe, expect, it } from "bun:test";

import {
  countMergeOverlaps,
  labelForIndex,
  planMerge,
  relabelSections,
} from "./sections.js";

const sections = [
  { id: "sec_6_a", name: "A", order: 0 },
  { id: "sec_6_b", name: "B", order: 1 },
  { id: "sec_6_c", name: "C", order: 2 },
  { id: "sec_6_d", name: "D", order: 3 },
];

describe("labelForIndex", () => {
  it("maps the first 26 indexes to single letters", () => {
    expect(labelForIndex(0)).toBe("A");
    expect(labelForIndex(5)).toBe("F");
    expect(labelForIndex(25)).toBe("Z");
  });

  it("rolls over to two letters past Z", () => {
    expect(labelForIndex(26)).toBe("AA");
    expect(labelForIndex(27)).toBe("AB");
  });
});

describe("relabelSections", () => {
  it("assigns sequential labels in order", () => {
    expect(relabelSections(sections).map((s) => s.name)).toEqual(["A", "B", "C", "D"]);
  });

  it("closes gaps left by a removed section", () => {
    const withoutB = sections.filter((s) => s.id !== "sec_6_b");
    expect(relabelSections(withoutB)).toEqual([
      { id: "sec_6_a", order: 0, name: "A" },
      { id: "sec_6_c", order: 1, name: "B" },
      { id: "sec_6_d", order: 2, name: "C" },
    ]);
  });
});

describe("planMerge", () => {
  it("merges B into A so C becomes B and D becomes C", () => {
    const plan = planMerge(sections, "sec_6_b", "sec_6_a");

    expect(plan.removed).toBe("sec_6_b");
    expect(plan.keep).toEqual([
      { id: "sec_6_a", order: 0, name: "A" },
      { id: "sec_6_c", order: 1, name: "B" },
      { id: "sec_6_d", order: 2, name: "C" },
    ]);
  });

  it("refuses to merge a section into itself", () => {
    expect(() => planMerge(sections, "sec_6_a", "sec_6_a")).toThrow(
      "Cannot merge a section into itself",
    );
  });

  it("rejects unknown sections", () => {
    expect(() => planMerge(sections, "sec_6_z", "sec_6_a")).toThrow("Unknown section");
  });
});

describe("countMergeOverlaps", () => {
  const entry = (id: string, sectionId: string, periodId: number, dayIds: number[]) => ({
    id,
    classId: "6",
    sectionId,
    periodId,
    dayIds,
    note: null,
    assignments: [],
    matched: true,
    lectures: dayIds.length,
  });

  it("counts the slots that would end up holding two lectures", () => {
    const entries = [
      entry("a1", "sec_6_a", 1, [1, 2]),
      entry("a2", "sec_6_a", 2, [1]),
      entry("b1", "sec_6_b", 1, [2, 3]),
      entry("b2", "sec_6_b", 2, [1]),
    ];

    expect(countMergeOverlaps(entries, "sec_6_a", "sec_6_b")).toBe(2);
  });

  it("is quiet when the two sections never teach at the same time", () => {
    const entries = [entry("a1", "sec_6_a", 1, [1]), entry("b1", "sec_6_b", 2, [1])];

    expect(countMergeOverlaps(entries, "sec_6_a", "sec_6_b")).toBe(0);
  });

  it("ignores the other sections entirely", () => {
    const entries = [entry("a1", "sec_6_a", 1, [1]), entry("c1", "sec_6_c", 1, [1])];

    expect(countMergeOverlaps(entries, "sec_6_a", "sec_6_b")).toBe(0);
  });
});
