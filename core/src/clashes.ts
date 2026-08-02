import type { ResolvedDataset, ResolvedEntry } from "./types.js";

export type ClashKind = "section" | "teacher";

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

function teacherClashes(entries: ResolvedEntry[]): Clash[] {
  const slots = new Map<string, Slot>();

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
    const id = `teacher:${teacherId}:${period}:${entryIds.join("+")}`;
    collect(
      groups,
      id,
      {
        id,
        kind: "teacher",
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

  return [...sectionClashes(dataset.entries), ...teacherClashes(dataset.entries)]
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
