import type { ResolvedDataset, ResolvedEntry, ResolvedSection } from "./types.js";

export type ClashKind = "section" | "teacher" | "elective";

export type Clash = {
  id: string;
  kind: ClashKind;
  periodId: number;
  dayIds: number[];
  sectionId: string | null;
  teacherId: string | null;
  entryIds: string[];
};

type Slot = { entryIds: string[]; sectionIds: Set<string> };

function slotFor(slots: Map<string, Slot>, key: string): Slot {
  const existing = slots.get(key);
  if (existing) return existing;
  const created: Slot = { entryIds: [], sectionIds: new Set<string>() };
  slots.set(key, created);
  return created;
}

function unique(ids: string[]): string[] {
  return [...new Set(ids)].sort();
}

function collect(
  groups: Map<string, Clash>,
  id: string,
  clash: Omit<Clash, "dayIds">,
  dayId: number,
): void {
  const existing = groups.get(id);
  if (existing) {
    if (!existing.dayIds.includes(dayId)) existing.dayIds.push(dayId);
    return;
  }
  groups.set(id, { ...clash, dayIds: [dayId] });
}

function sectionClashes(entries: ResolvedEntry[]): Clash[] {
  const slots = new Map<string, Slot>();

  for (const entry of entries) {
    for (const dayId of entry.dayIds) {
      const slot = slotFor(
        slots,
        `${entry.sectionId}|${String(entry.periodId)}|${String(dayId)}`,
      );
      slot.entryIds.push(entry.id);
    }
  }

  const groups = new Map<string, Clash>();

  for (const [key, slot] of slots) {
    if (slot.entryIds.length < 2) continue;
    const [sectionId = "", period = "", day = ""] = key.split("|");
    const entryIds = unique(slot.entryIds);
    const id = `section:${sectionId}:${period}:${entryIds.join("+")}`;
    collect(
      groups,
      id,
      {
        id,
        kind: "section",
        periodId: Number(period),
        sectionId,
        teacherId: null,
        entryIds,
      },
      Number(day),
    );
  }

  return [...groups.values()];
}

function isElectiveBlock(
  teacherId: string,
  entries: ResolvedEntry[],
  sections: Map<string, ResolvedSection>,
): boolean {
  const taught = entries.flatMap((entry) =>
    entry.assignments
      .filter((assignment) => assignment.teacher?.id === teacherId)
      .map((assignment) => ({ subject: assignment.subject, sectionId: entry.sectionId })),
  );

  if (taught.length < 2) return false;
  if (new Set(taught.map((item) => item.subject.id)).size !== 1) return false;

  return taught.every((item) =>
    sections
      .get(item.sectionId)
      ?.electives.some((elective) => elective.id === item.subject.id),
  );
}

function teacherClashes(
  entries: ResolvedEntry[],
  sections: Map<string, ResolvedSection>,
): Clash[] {
  const slots = new Map<string, Slot>();
  const byId = new Map(entries.map((entry) => [entry.id, entry]));

  for (const entry of entries) {
    for (const assignment of entry.assignments) {
      const teacher = assignment.teacher;
      if (!teacher) continue;
      for (const dayId of entry.dayIds) {
        const slot = slotFor(
          slots,
          `${teacher.id}|${String(entry.periodId)}|${String(dayId)}`,
        );
        slot.entryIds.push(entry.id);
        slot.sectionIds.add(entry.sectionId);
      }
    }
  }

  const groups = new Map<string, Clash>();

  for (const [key, slot] of slots) {
    if (slot.entryIds.length < 2) continue;
    const entryIds = unique(slot.entryIds);
    if (entryIds.length > 1 && slot.sectionIds.size === 1) continue;

    const [teacherId = "", period = "", day = ""] = key.split("|");
    const involved = entryIds
      .map((entryId) => byId.get(entryId))
      .filter((entry): entry is ResolvedEntry => entry !== undefined);
    const elective = isElectiveBlock(teacherId, involved, sections);

    const id = `${elective ? "elective" : "teacher"}:${teacherId}:${period}:${entryIds.join("+")}`;
    collect(
      groups,
      id,
      {
        id,
        kind: elective ? "elective" : "teacher",
        periodId: Number(period),
        sectionId: null,
        teacherId,
        entryIds,
      },
      Number(day),
    );
  }

  return [...groups.values()];
}

export function findClashes(dataset: ResolvedDataset): Clash[] {
  const sectionOrder = new Map(
    dataset.sections.map((section, index) => [section.id, index]),
  );

  const sectionById = new Map(
    dataset.sections.map((section) => [section.id, section] as const),
  );

  return [
    ...sectionClashes(dataset.entries),
    ...teacherClashes(dataset.entries, sectionById),
  ]
    .map((clash) => ({ ...clash, dayIds: [...clash.dayIds].sort((a, b) => a - b) }))
    .sort(
      (a, b) =>
        a.periodId - b.periodId ||
        (sectionOrder.get(a.sectionId ?? "") ?? Number.MAX_SAFE_INTEGER) -
          (sectionOrder.get(b.sectionId ?? "") ?? Number.MAX_SAFE_INTEGER) ||
        a.kind.localeCompare(b.kind) ||
        a.id.localeCompare(b.id),
    );
}
