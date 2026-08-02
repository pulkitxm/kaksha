import type { ResolvedEntry, Section } from "./types.js";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function labelForIndex(index: number): string {
  if (index < ALPHABET.length) return ALPHABET[index] ?? "A";

  const first = Math.floor(index / ALPHABET.length) - 1;
  const second = index % ALPHABET.length;
  return `${ALPHABET[first] ?? "A"}${ALPHABET[second] ?? "A"}`;
}

export type SectionOrderChange = {
  id: string;
  order: number;
  name: string;
};

export function relabelSections(
  sections: Pick<Section, "id" | "name" | "order">[],
): SectionOrderChange[] {
  return [...sections]
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))
    .map((section, index) => ({
      id: section.id,
      order: index,
      name: labelForIndex(index),
    }));
}

export function planMerge(
  sections: Pick<Section, "id" | "name" | "order">[],
  sourceId: string,
  targetId: string,
): { keep: SectionOrderChange[]; removed: string } {
  if (sourceId === targetId) {
    throw new Error("Cannot merge a section into itself");
  }

  const source = sections.find((section) => section.id === sourceId);
  const target = sections.find((section) => section.id === targetId);

  if (!source) throw new Error(`Unknown section ${sourceId}`);
  if (!target) throw new Error(`Unknown section ${targetId}`);

  const survivors = sections.filter((section) => section.id !== sourceId);

  return { keep: relabelSections(survivors), removed: sourceId };
}

export function countMergeOverlaps(
  entries: ResolvedEntry[],
  sourceId: string,
  targetId: string,
): number {
  const taken = new Set<string>();

  for (const entry of entries) {
    if (entry.sectionId !== targetId) continue;
    for (const dayId of entry.dayIds) {
      taken.add(`${String(entry.periodId)}|${String(dayId)}`);
    }
  }

  const clashing = new Set<string>();

  for (const entry of entries) {
    if (entry.sectionId !== sourceId) continue;
    for (const dayId of entry.dayIds) {
      const slot = `${String(entry.periodId)}|${String(dayId)}`;
      if (taken.has(slot)) clashing.add(slot);
    }
  }

  return clashing.size;
}
