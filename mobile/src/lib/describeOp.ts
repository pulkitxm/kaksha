import type { Database } from "@kaksha/core";

import type { LocalOp } from "./local";

function className(db: Database | null, classId: string): string {
  return db?.classes.find((record) => record.id === classId)?.name ?? classId;
}

function sectionName(db: Database | null, sectionId: string): string {
  const section = db?.sections.find((item) => item.id === sectionId);
  if (!section) return "a section";
  return `${className(db, section.classId)} section ${section.name}`;
}

function subjectName(db: Database | null, subjectId: string): string {
  return db?.subjects.find((item) => item.id === subjectId)?.name ?? "a subject";
}

function teacherName(db: Database | null, teacherId: string): string {
  return db?.teachers.find((item) => item.id === teacherId)?.name ?? "a teacher";
}

export function describeOp(op: LocalOp, db: Database | null): string {
  switch (op.kind) {
    case "createEntry":
      return `Add a lecture to ${sectionName(db, op.input.sectionId)}`;
    case "updateEntry":
      return "Change a lecture";
    case "deleteEntry":
      return "Remove a lecture";
    case "renameSection":
      return `Rename a section to ${op.name}`;
    case "mergeSections":
      return `Merge two sections of ${className(db, op.input.classId)}`;
    case "reorderSections":
      return `Reorder the sections of ${className(db, op.input.classId)}`;
    case "createSection":
      return `Add section ${op.input.name} to ${className(db, op.input.classId)}`;
    case "deleteSection":
      return `Remove ${sectionName(db, op.id)}`;
    case "setSectionElectives":
      return `Change the electives of ${sectionName(db, op.id)}`;
    case "createTeacher":
      return `Add the teacher ${op.input.name}`;
    case "updateTeacher":
      return `Change the details of ${teacherName(db, op.id)}`;
    case "deleteTeacher":
      return `Remove the teacher ${teacherName(db, op.id)}`;
    case "createSubject":
      return `Add the subject ${op.input.name}`;
    case "updateSubject":
      return `Change the subject ${subjectName(db, op.id)}`;
    case "deleteSubject":
      return `Remove the subject ${subjectName(db, op.id)}`;
    case "setClassSubjects":
      return `Change which subjects ${className(db, op.classId)} teaches`;
    case "createClass":
      return `Add the class ${op.input.name}`;
    case "updateClass":
      return `Change the class ${className(db, op.id)}`;
    case "deleteClass":
      return `Remove the class ${className(db, op.id)}`;
  }
}
