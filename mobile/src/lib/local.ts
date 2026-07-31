import {
  labelForIndex,
  planMerge,
  type CreateEntryInput,
  type Entry,
  type MergeSectionsInput,
  type RawDataset,
  type ReorderSectionsInput,
} from "@kaksha/core";

export type EntryPatch = {
  sectionId?: string;
  periodId?: number;
  dayIds?: number[];
  assignments?: { subjectId: string; teacherId: string | null }[];
  note?: string | null;
};

export type LocalOp =
  | { kind: "createEntry"; localId: string; input: CreateEntryInput }
  | { kind: "updateEntry"; id: string; patch: EntryPatch }
  | { kind: "deleteEntry"; id: string }
  | { kind: "renameSection"; id: string; name: string }
  | { kind: "mergeSections"; input: MergeSectionsInput }
  | { kind: "reorderSections"; input: ReorderSectionsInput };

const LOCAL_MARKER = "_local_";

export function makeLocalEntryId(classId: string): string {
  return `ent_${classId}${LOCAL_MARKER}${Date.now().toString(36)}`;
}

export function isLocalEntryId(id: string): boolean {
  return id.includes(LOCAL_MARKER);
}

function patchEntry(entry: Entry, patch: EntryPatch): Entry {
  return {
    ...entry,
    sectionId: patch.sectionId ?? entry.sectionId,
    periodId: patch.periodId ?? entry.periodId,
    dayIds: patch.dayIds ?? entry.dayIds,
    assignments: patch.assignments ?? entry.assignments,
    note: patch.note === undefined ? entry.note : patch.note,
  };
}

export function applyOp(raw: RawDataset, op: LocalOp): RawDataset {
  switch (op.kind) {
    case "createEntry": {
      const entry: Entry = {
        id: op.localId,
        classId: op.input.classId,
        sectionId: op.input.sectionId,
        periodId: op.input.periodId,
        dayIds: op.input.dayIds,
        assignments: op.input.assignments,
        note: op.input.note,
      };
      return { ...raw, entries: [...raw.entries, entry] };
    }
    case "updateEntry":
      return {
        ...raw,
        entries: raw.entries.map((entry) =>
          entry.id === op.id ? patchEntry(entry, op.patch) : entry,
        ),
      };
    case "deleteEntry":
      return { ...raw, entries: raw.entries.filter((entry) => entry.id !== op.id) };
    case "renameSection":
      return {
        ...raw,
        sections: raw.sections.map((section) =>
          section.id === op.id ? { ...section, name: op.name } : section,
        ),
      };
    case "mergeSections": {
      const { sourceId, targetId, relabel } = op.input;
      const source = raw.sections.find((section) => section.id === sourceId);
      const target = raw.sections.find((section) => section.id === targetId);
      if (!source || !target) return raw;

      const plan = planMerge(raw.sections, sourceId, targetId);
      const mergedElectives = [
        ...target.electiveSubjectIds,
        ...source.electiveSubjectIds.filter(
          (id) => !target.electiveSubjectIds.includes(id),
        ),
      ];

      const sections = raw.sections
        .filter((section) => section.id !== sourceId)
        .map((section) => {
          const next =
            section.id === targetId
              ? { ...section, electiveSubjectIds: mergedElectives }
              : section;
          if (!relabel) return next;
          const change = plan.keep.find((item) => item.id === section.id);
          return change ? { ...next, order: change.order, name: change.name } : next;
        });

      return {
        ...raw,
        sections,
        entries: raw.entries.map((entry) =>
          entry.sectionId === sourceId ? { ...entry, sectionId: targetId } : entry,
        ),
      };
    }
    case "reorderSections": {
      const { orderedIds, relabel } = op.input;
      const position = new Map(orderedIds.map((id, index) => [id, index]));
      return {
        ...raw,
        sections: raw.sections.map((section) => {
          const index = position.get(section.id);
          if (index === undefined) return section;
          return {
            ...section,
            order: index,
            name: relabel ? labelForIndex(index) : section.name,
          };
        }),
      };
    }
  }
}

export function enqueueOp(queue: LocalOp[], op: LocalOp): LocalOp[] {
  if (op.kind === "updateEntry" && isLocalEntryId(op.id)) {
    return queue.map((item) =>
      item.kind === "createEntry" && item.localId === op.id
        ? {
            ...item,
            input: {
              ...item.input,
              sectionId: op.patch.sectionId ?? item.input.sectionId,
              periodId: op.patch.periodId ?? item.input.periodId,
              dayIds: op.patch.dayIds ?? item.input.dayIds,
              assignments: op.patch.assignments ?? item.input.assignments,
              note: op.patch.note === undefined ? item.input.note : op.patch.note,
            },
          }
        : item,
    );
  }

  if (op.kind === "deleteEntry" && isLocalEntryId(op.id)) {
    return queue.filter(
      (item) => !(item.kind === "createEntry" && item.localId === op.id),
    );
  }

  return [...queue, op];
}
