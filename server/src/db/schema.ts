import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const school = pgTable("school", {
  id: text("id").primaryKey().default("default"),
  name: text("name").notNull().default(""),
  title: text("title").notNull(),
  session: text("session").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const days = pgTable("days", {
  id: integer("id").primaryKey(),
  name: text("name").notNull(),
  short: text("short").notNull(),
  order: integer("order").notNull(),
});

export const subjects = pgTable(
  "subjects",
  {
    id: text("id").primaryKey(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    group: text("group").notNull(),
    color: text("color").notNull(),
  },
  (table) => [uniqueIndex("subjects_code_key").on(table.code)],
);

export const teachers = pgTable("teachers", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  shortName: text("short_name").notNull(),
  department: text("department"),
  active: boolean("active").notNull().default(true),
});

export const classes = pgTable("classes", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  shortName: text("short_name").notNull(),
  order: integer("order").notNull(),
  active: boolean("active").notNull().default(false),
});

export const periods = pgTable(
  "periods",
  {
    classId: text("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    periodId: integer("period_id").notNull(),
    name: text("name").notNull(),
    label: text("label").notNull(),
  },
  (table) => [primaryKey({ columns: [table.classId, table.periodId] })],
);

export const classSubjects = pgTable(
  "class_subjects",
  {
    classId: text("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    subjectId: text("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.classId, table.subjectId] })],
);

export const sections = pgTable(
  "sections",
  {
    id: text("id").primaryKey(),
    classId: text("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    order: integer("order").notNull(),
    note: text("note"),
  },
  (table) => [index("sections_class_idx").on(table.classId)],
);

export const sectionElectives = pgTable(
  "section_electives",
  {
    sectionId: text("section_id")
      .notNull()
      .references(() => sections.id, { onDelete: "cascade" }),
    subjectId: text("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
  },
  (table) => [primaryKey({ columns: [table.sectionId, table.subjectId] })],
);

export const entries = pgTable(
  "entries",
  {
    id: text("id").primaryKey(),
    classId: text("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    sectionId: text("section_id")
      .notNull()
      .references(() => sections.id, { onDelete: "cascade" }),
    periodId: integer("period_id").notNull(),
    note: text("note"),
  },
  (table) => [
    index("entries_class_idx").on(table.classId),
    index("entries_section_period_idx").on(table.sectionId, table.periodId),
  ],
);

export const entryDays = pgTable(
  "entry_days",
  {
    entryId: text("entry_id")
      .notNull()
      .references(() => entries.id, { onDelete: "cascade" }),
    dayId: integer("day_id")
      .notNull()
      .references(() => days.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.entryId, table.dayId] }),
    index("entry_days_day_idx").on(table.dayId),
  ],
);

export const entryAssignments = pgTable(
  "entry_assignments",
  {
    entryId: text("entry_id")
      .notNull()
      .references(() => entries.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    subjectId: text("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "restrict" }),
    teacherId: text("teacher_id").references(() => teachers.id, {
      onDelete: "set null",
    }),
  },
  (table) => [
    primaryKey({ columns: [table.entryId, table.position] }),
    index("entry_assignments_teacher_idx").on(table.teacherId),
    index("entry_assignments_subject_idx").on(table.subjectId),
  ],
);

export const notes = pgTable(
  "notes",
  {
    id: text("id").primaryKey(),
    classId: text("class_id").references(() => classes.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    html: text("html").notNull().default(""),
    preview: text("preview").notNull().default(""),
    pinned: boolean("pinned").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("notes_class_idx").on(table.classId)],
);

export const classesRelations = relations(classes, ({ many }) => ({
  periods: many(periods),
  sections: many(sections),
  entries: many(entries),
  classSubjects: many(classSubjects),
}));

export const periodsRelations = relations(periods, ({ one }) => ({
  class: one(classes, { fields: [periods.classId], references: [classes.id] }),
}));

export const classSubjectsRelations = relations(classSubjects, ({ one }) => ({
  class: one(classes, { fields: [classSubjects.classId], references: [classes.id] }),
  subject: one(subjects, {
    fields: [classSubjects.subjectId],
    references: [subjects.id],
  }),
}));

export const sectionsRelations = relations(sections, ({ one, many }) => ({
  class: one(classes, { fields: [sections.classId], references: [classes.id] }),
  electives: many(sectionElectives),
  entries: many(entries),
}));

export const sectionElectivesRelations = relations(sectionElectives, ({ one }) => ({
  section: one(sections, {
    fields: [sectionElectives.sectionId],
    references: [sections.id],
  }),
  subject: one(subjects, {
    fields: [sectionElectives.subjectId],
    references: [subjects.id],
  }),
}));

export const entriesRelations = relations(entries, ({ one, many }) => ({
  class: one(classes, { fields: [entries.classId], references: [classes.id] }),
  section: one(sections, { fields: [entries.sectionId], references: [sections.id] }),
  days: many(entryDays),
  assignments: many(entryAssignments),
}));

export const entryDaysRelations = relations(entryDays, ({ one }) => ({
  entry: one(entries, { fields: [entryDays.entryId], references: [entries.id] }),
  day: one(days, { fields: [entryDays.dayId], references: [days.id] }),
}));

export const entryAssignmentsRelations = relations(entryAssignments, ({ one }) => ({
  entry: one(entries, { fields: [entryAssignments.entryId], references: [entries.id] }),
  subject: one(subjects, {
    fields: [entryAssignments.subjectId],
    references: [subjects.id],
  }),
  teacher: one(teachers, {
    fields: [entryAssignments.teacherId],
    references: [teachers.id],
  }),
}));

export const subjectsRelations = relations(subjects, ({ many }) => ({
  assignments: many(entryAssignments),
  classSubjects: many(classSubjects),
  sectionElectives: many(sectionElectives),
}));

export const teachersRelations = relations(teachers, ({ many }) => ({
  assignments: many(entryAssignments),
}));

export const daysRelations = relations(days, ({ many }) => ({
  entryDays: many(entryDays),
}));
