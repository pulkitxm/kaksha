import type { ClassSummary, Database, RawDataset } from "./types.js";

function countEntriesByClass(db: Database): Map<string, number> {
  const counts = new Map<string, number>();
  for (const entry of db.entries) {
    counts.set(entry.classId, (counts.get(entry.classId) ?? 0) + 1);
  }
  return counts;
}

export function summarizeClasses(db: Database): ClassSummary[] {
  const counts = countEntriesByClass(db);
  return [...db.classes]
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
    .map((record) => ({
      id: record.id,
      name: record.name,
      shortName: record.shortName,
      active: record.active,
      entryCount: counts.get(record.id) ?? 0,
    }));
}

export function resolveClassId(db: Database, requested: string | null): string | null {
  const record =
    db.classes.find((item) => item.id === requested) ??
    db.classes.find((item) => item.active) ??
    [...db.classes].sort((a, b) => a.order - b.order)[0];
  return record?.id ?? null;
}

export function sliceClass(db: Database, requested: string | null): RawDataset | null {
  const classId = resolveClassId(db, requested);
  const currentClass = db.classes.find((item) => item.id === classId);
  if (!currentClass) return null;

  return {
    school: db.school,
    classes: summarizeClasses(db),
    currentClass,
    days: [...db.days].sort((a, b) => a.order - b.order),
    subjects: db.subjects,
    teachers: db.teachers,
    sections: db.sections
      .filter((section) => section.classId === currentClass.id)
      .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name)),
    entries: db.entries
      .filter((entry) => entry.classId === currentClass.id)
      .sort(
        (a, b) =>
          a.sectionId.localeCompare(b.sectionId) ||
          a.periodId - b.periodId ||
          a.id.localeCompare(b.id),
      ),
  };
}
