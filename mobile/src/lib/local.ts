import {
  labelForIndex,
  planMerge,
  relabelSections,
  type CreateClassInput,
  type CreateEntryInput,
  type CreateSectionInput,
  type CreateSubjectInput,
  type CreateTeacherInput,
  type Entry,
  type MergeSectionsInput,
  type RawDataset,
  type ReorderSectionsInput,
  type UpdateClassInput,
  type UpdateSubjectInput,
  type UpdateTeacherInput,
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
  | { kind: "reorderSections"; input: ReorderSectionsInput }
  | { kind: "createSection"; localId: string; input: CreateSectionInput }
  | { kind: "deleteSection"; id: string }
  | { kind: "setSectionElectives"; id: string; electiveSubjectIds: string[] }
  | { kind: "createTeacher"; localId: string; input: CreateTeacherInput }
  | { kind: "updateTeacher"; id: string; patch: UpdateTeacherInput }
  | { kind: "deleteTeacher"; id: string; force: boolean }
  | { kind: "createSubject"; localId: string; input: CreateSubjectInput }
  | { kind: "updateSubject"; id: string; patch: UpdateSubjectInput }
  | { kind: "deleteSubject"; id: string }
  | { kind: "setClassSubjects"; classId: string; subjectIds: string[] }
  | { kind: "createClass"; input: CreateClassInput }
  | { kind: "updateClass"; id: string; patch: UpdateClassInput }
  | { kind: "deleteClass"; id: string; force: boolean };

const LOCAL_MARKER = "_local_";

export function makeLocalId(prefix: string, scope: string): string {
  return `${prefix}_${scope}${LOCAL_MARKER}${Date.now().toString(36)}`;
}

export function makeLocalEntryId(classId: string): string {
  return makeLocalId("ent", classId);
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
    case "createSection":
      return {
        ...raw,
        sections: [
          ...raw.sections,
          {
            id: op.localId,
            classId: op.input.classId,
            name: op.input.name,
            order: raw.sections.length,
            electiveSubjectIds: op.input.electiveSubjectIds,
            note: op.input.note,
          },
        ],
      };
    case "deleteSection": {
      const survivors = raw.sections.filter((section) => section.id !== op.id);
      const plan = new Map(
        relabelSections(survivors).map((change) => [change.id, change]),
      );
      return {
        ...raw,
        sections: survivors.map((section) => {
          const change = plan.get(section.id);
          return change
            ? { ...section, order: change.order, name: change.name }
            : section;
        }),
        entries: raw.entries.filter((entry) => entry.sectionId !== op.id),
      };
    }
    case "setSectionElectives":
      return {
        ...raw,
        sections: raw.sections.map((section) =>
          section.id === op.id
            ? { ...section, electiveSubjectIds: op.electiveSubjectIds }
            : section,
        ),
      };
    case "createTeacher":
      return {
        ...raw,
        teachers: [
          ...raw.teachers,
          {
            id: op.localId,
            name: op.input.name,
            shortName: op.input.shortName,
            department: op.input.department,
            active: op.input.active,
          },
        ],
      };
    case "updateTeacher":
      return {
        ...raw,
        teachers: raw.teachers.map((teacher) =>
          teacher.id === op.id ? { ...teacher, ...op.patch } : teacher,
        ),
      };
    case "deleteTeacher":
      return {
        ...raw,
        teachers: raw.teachers.filter((teacher) => teacher.id !== op.id),
        entries: raw.entries.map((entry) => ({
          ...entry,
          assignments: entry.assignments.map((assignment) =>
            assignment.teacherId === op.id
              ? { ...assignment, teacherId: null }
              : assignment,
          ),
        })),
      };
    case "createSubject": {
      const inClass = op.input.classIds.includes(raw.currentClass.id);
      return {
        ...raw,
        subjects: [
          ...raw.subjects,
          {
            id: op.localId,
            code: op.input.code,
            name: op.input.name,
            group: op.input.group,
            color: op.input.color,
          },
        ],
        currentClass: inClass
          ? {
              ...raw.currentClass,
              subjectIds: [...raw.currentClass.subjectIds, op.localId],
            }
          : raw.currentClass,
      };
    }
    case "updateSubject":
      return {
        ...raw,
        subjects: raw.subjects.map((subject) =>
          subject.id === op.id ? { ...subject, ...op.patch } : subject,
        ),
      };
    case "deleteSubject":
      return {
        ...raw,
        subjects: raw.subjects.filter((subject) => subject.id !== op.id),
        currentClass: {
          ...raw.currentClass,
          subjectIds: raw.currentClass.subjectIds.filter((id) => id !== op.id),
        },
        sections: raw.sections.map((section) => ({
          ...section,
          electiveSubjectIds: section.electiveSubjectIds.filter((id) => id !== op.id),
        })),
      };
    case "setClassSubjects":
      return op.classId === raw.currentClass.id
        ? { ...raw, currentClass: { ...raw.currentClass, subjectIds: op.subjectIds } }
        : raw;
    case "createClass":
      return {
        ...raw,
        classes: [
          ...raw.classes,
          {
            id: op.input.id,
            name: op.input.name,
            shortName: op.input.shortName,
            active: op.input.active,
            entryCount: 0,
          },
        ],
      };
    case "updateClass": {
      const summary = {
        ...(op.patch.name === undefined ? {} : { name: op.patch.name }),
        ...(op.patch.shortName === undefined ? {} : { shortName: op.patch.shortName }),
        ...(op.patch.active === undefined ? {} : { active: op.patch.active }),
      };
      return {
        ...raw,
        classes: raw.classes.map((record) =>
          record.id === op.id ? { ...record, ...summary } : record,
        ),
        currentClass:
          op.id === raw.currentClass.id
            ? {
                ...raw.currentClass,
                ...summary,
                periods: op.patch.periods ?? raw.currentClass.periods,
              }
            : raw.currentClass,
      };
    }
    case "deleteClass":
      return { ...raw, classes: raw.classes.filter((record) => record.id !== op.id) };
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
