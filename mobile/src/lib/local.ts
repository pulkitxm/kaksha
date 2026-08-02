import {
  labelForIndex,
  planMerge,
  relabelSections,
  type ClassRecord,
  type CreateClassInput,
  type CreateEntryInput,
  type CreateSectionInput,
  type CreateSubjectInput,
  type CreateTeacherInput,
  type Database,
  type Entry,
  type MergeSectionsInput,
  type ReorderSectionsInput,
  type Section,
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

function sectionsOf(db: Database, classId: string): Section[] {
  return db.sections.filter((section) => section.classId === classId);
}

function patchClass(
  db: Database,
  id: string,
  patch: Partial<ClassRecord>,
): ClassRecord[] {
  return db.classes.map((record) =>
    record.id === id ? { ...record, ...patch } : record,
  );
}

export function applyOp(db: Database, op: LocalOp): Database {
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
      return { ...db, entries: [...db.entries, entry] };
    }
    case "updateEntry":
      return {
        ...db,
        entries: db.entries.map((entry) =>
          entry.id === op.id ? patchEntry(entry, op.patch) : entry,
        ),
      };
    case "deleteEntry":
      return { ...db, entries: db.entries.filter((entry) => entry.id !== op.id) };
    case "renameSection":
      return {
        ...db,
        sections: db.sections.map((section) =>
          section.id === op.id ? { ...section, name: op.name } : section,
        ),
      };
    case "mergeSections": {
      const { classId, sourceId, targetId, relabel } = op.input;
      const siblings = sectionsOf(db, classId);
      const source = siblings.find((section) => section.id === sourceId);
      const target = siblings.find((section) => section.id === targetId);
      if (!source || !target) return db;

      const plan = planMerge(siblings, sourceId, targetId);
      const mergedElectives = [
        ...target.electiveSubjectIds,
        ...source.electiveSubjectIds.filter(
          (id) => !target.electiveSubjectIds.includes(id),
        ),
      ];
      const changes = new Map(plan.keep.map((change) => [change.id, change]));

      return {
        ...db,
        sections: db.sections
          .filter((section) => section.id !== sourceId)
          .map((section) => {
            const merged =
              section.id === targetId
                ? { ...section, electiveSubjectIds: mergedElectives }
                : section;
            if (!relabel || section.classId !== classId) return merged;
            const change = changes.get(section.id);
            return change
              ? { ...merged, order: change.order, name: change.name }
              : merged;
          }),
        entries: db.entries.map((entry) =>
          entry.sectionId === sourceId ? { ...entry, sectionId: targetId } : entry,
        ),
      };
    }
    case "reorderSections": {
      const { classId, orderedIds, relabel } = op.input;
      const position = new Map(orderedIds.map((id, index) => [id, index]));
      return {
        ...db,
        sections: db.sections.map((section) => {
          if (section.classId !== classId) return section;
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
        ...db,
        sections: [
          ...db.sections,
          {
            id: op.localId,
            classId: op.input.classId,
            name: op.input.name,
            order: sectionsOf(db, op.input.classId).length,
            electiveSubjectIds: op.input.electiveSubjectIds,
            note: op.input.note,
          },
        ],
      };
    case "deleteSection": {
      const removed = db.sections.find((section) => section.id === op.id);
      if (!removed) return db;

      const survivors = db.sections.filter((section) => section.id !== op.id);
      const changes = new Map(
        relabelSections(
          survivors.filter((section) => section.classId === removed.classId),
        ).map((change) => [change.id, change]),
      );

      return {
        ...db,
        sections: survivors.map((section) => {
          const change = changes.get(section.id);
          return change
            ? { ...section, order: change.order, name: change.name }
            : section;
        }),
        entries: db.entries.filter((entry) => entry.sectionId !== op.id),
      };
    }
    case "setSectionElectives":
      return {
        ...db,
        sections: db.sections.map((section) =>
          section.id === op.id
            ? { ...section, electiveSubjectIds: op.electiveSubjectIds }
            : section,
        ),
      };
    case "createTeacher":
      return {
        ...db,
        teachers: [
          ...db.teachers,
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
        ...db,
        teachers: db.teachers.map((teacher) =>
          teacher.id === op.id ? { ...teacher, ...op.patch } : teacher,
        ),
      };
    case "deleteTeacher":
      return {
        ...db,
        teachers: db.teachers.filter((teacher) => teacher.id !== op.id),
        entries: db.entries.map((entry) => ({
          ...entry,
          assignments: entry.assignments.map((assignment) =>
            assignment.teacherId === op.id
              ? { ...assignment, teacherId: null }
              : assignment,
          ),
        })),
      };
    case "createSubject":
      return {
        ...db,
        subjects: [
          ...db.subjects,
          {
            id: op.localId,
            code: op.input.code,
            name: op.input.name,
            group: op.input.group,
            color: op.input.color,
          },
        ],
        classes: db.classes.map((record) =>
          op.input.classIds.includes(record.id)
            ? { ...record, subjectIds: [...record.subjectIds, op.localId] }
            : record,
        ),
      };
    case "updateSubject":
      return {
        ...db,
        subjects: db.subjects.map((subject) =>
          subject.id === op.id ? { ...subject, ...op.patch } : subject,
        ),
      };
    case "deleteSubject":
      return {
        ...db,
        subjects: db.subjects.filter((subject) => subject.id !== op.id),
        classes: db.classes.map((record) => ({
          ...record,
          subjectIds: record.subjectIds.filter((id) => id !== op.id),
        })),
        sections: db.sections.map((section) => ({
          ...section,
          electiveSubjectIds: section.electiveSubjectIds.filter((id) => id !== op.id),
        })),
      };
    case "setClassSubjects":
      return {
        ...db,
        classes: patchClass(db, op.classId, { subjectIds: op.subjectIds }),
      };
    case "createClass":
      return {
        ...db,
        classes: [
          ...db.classes,
          {
            id: op.input.id,
            name: op.input.name,
            shortName: op.input.shortName,
            order: db.classes.length,
            active: op.input.active,
            periods: op.input.periods,
            subjectIds: op.input.subjectIds,
          },
        ],
      };
    case "updateClass":
      return { ...db, classes: patchClass(db, op.id, op.patch) };
    case "deleteClass":
      return {
        ...db,
        classes: db.classes.filter((record) => record.id !== op.id),
        sections: db.sections.filter((section) => section.classId !== op.id),
        entries: db.entries.filter((entry) => entry.classId !== op.id),
        notes: db.notes.filter((note) => note.classId !== op.id),
      };
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
