import { describe, expect, it } from "vitest";

import { mergeSectionsSchema, updateEntrySchema } from "./mutations.js";
import { classParamSchema, entrySchema, filtersSchema } from "./schemas.js";

describe("filtersSchema", () => {
  it("splits comma joined ids", () => {
    const parsed = filtersSchema.parse({ teacher: "tch_a,tch_b" });
    expect(parsed.teacher).toEqual(["tch_a", "tch_b"]);
  });

  it("drops ids that do not match the prefix", () => {
    const parsed = filtersSchema.parse({ teacher: "tch_ok,DROP TABLE,sub_wrong" });
    expect(parsed.teacher).toEqual(["tch_ok"]);
  });

  it("drops days outside the week", () => {
    expect(filtersSchema.parse({ day: "1,9,abc,3" }).day).toEqual([1, 3]);
  });

  it("drops periods outside the allowed range", () => {
    expect(filtersSchema.parse({ period: "0,999,4" }).period).toEqual([0, 4]);
  });

  it("lowercases and trims the search term", () => {
    expect(filtersSchema.parse({ q: "  Seema K  " }).q).toBe("seema k");
  });

  it("defaults every dimension to empty", () => {
    const parsed = filtersSchema.parse({});
    expect(parsed).toEqual({
      teacher: [],
      subject: [],
      section: [],
      group: [],
      day: [],
      period: [],
      q: "",
    });
  });
});

describe("classParamSchema", () => {
  it("accepts a url safe id", () => {
    expect(classParamSchema.parse("6")).toBe("6");
  });

  it("rejects a path traversal attempt", () => {
    expect(classParamSchema.parse("../secrets")).toBeNull();
  });
});

describe("entrySchema", () => {
  it("requires at least one day", () => {
    const result = entrySchema.safeParse({
      id: "ent_6_a_0_1",
      classId: "6",
      sectionId: "sec_6_a",
      periodId: 0,
      dayIds: [],
      assignments: [{ subjectId: "sub_english", teacherId: "tch_renu" }],
      note: null,
    });
    expect(result.success).toBe(false);
  });

  it("accepts a split elective with several assignments", () => {
    const result = entrySchema.safeParse({
      id: "ent_6_a_4_2",
      classId: "6",
      sectionId: "sec_6_a",
      periodId: 4,
      dayIds: [2, 3],
      assignments: [
        { subjectId: "sub_skt", teacherId: "tch_vandana" },
        { subjectId: "sub_pnb", teacherId: null },
      ],
      note: null,
    });
    expect(result.success).toBe(true);
  });
});

describe("mutation schemas", () => {
  it("rejects an empty entry update", () => {
    expect(updateEntrySchema.safeParse({}).success).toBe(false);
  });

  it("accepts a partial entry update", () => {
    expect(updateEntrySchema.safeParse({ periodId: 3 }).success).toBe(true);
  });

  it("defaults merge relabelling to on", () => {
    const parsed = mergeSectionsSchema.parse({
      classId: "6",
      sourceId: "sec_6_b",
      targetId: "sec_6_a",
    });
    expect(parsed.relabel).toBe(true);
  });
});
