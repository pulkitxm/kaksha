export type ColorToken =
  | "blue"
  | "orange"
  | "violet"
  | "emerald"
  | "amber"
  | "rose"
  | "teal"
  | "cyan"
  | "lime"
  | "fuchsia"
  | "sky"
  | "slate";

export type School = {
  name: string;
  title: string;
  session: string;
  updatedAt: string;
};

export type Day = {
  id: number;
  name: string;
  short: string;
  order: number;
};

export type Period = {
  id: number;
  name: string;
  label: string;
};

export type Subject = {
  id: string;
  code: string;
  name: string;
  group: string;
  color: ColorToken;
};

export type Teacher = {
  id: string;
  name: string;
  shortName: string;
  department: string | null;
  active: boolean;
};

export type ClassRecord = {
  id: string;
  name: string;
  shortName: string;
  order: number;
  active: boolean;
  periods: Period[];
  subjectIds: string[];
};

export type Section = {
  id: string;
  classId: string;
  name: string;
  order: number;
  electiveSubjectIds: string[];
  note: string | null;
};

export type ResolvedSection = Omit<Section, "electiveSubjectIds"> & {
  electives: Subject[];
};

export type Assignment = {
  subjectId: string;
  teacherId: string | null;
};

export type Entry = {
  id: string;
  classId: string;
  sectionId: string;
  periodId: number;
  dayIds: number[];
  assignments: Assignment[];
  note: string | null;
};

export type ResolvedAssignment = {
  subject: Subject;
  teacher: Teacher | null;
};

export type ResolvedEntry = {
  id: string;
  classId: string;
  sectionId: string;
  periodId: number;
  dayIds: number[];
  note: string | null;
  assignments: ResolvedAssignment[];
  matched: boolean;
  lectures: number;
};

export type Filters = {
  teacher: string[];
  subject: string[];
  section: string[];
  day: number[];
  period: number[];
  group: string[];
  q: string;
};

export type TeacherLoadRow = {
  teacherId: string;
  teacher: string;
  lectures: number;
  slots: number;
  subjects: { id: string; code: string; color: ColorToken }[];
  sections: string[];
  byDay: Record<number, number>;
};

export type TeacherAvailabilityRow = {
  teacherId: string;
  teacher: string;
  perDay: { dayId: number; busy: number; free: number }[];
  totalBusy: number;
  totalFree: number;
};

export type Stats = {
  totalEntries: number;
  matchedEntries: number;
  matchedLectures: number;
  totalLectures: number;
  matchedTeachers: number;
  matchedSubjects: number;
  freeSlots: number;
};

export type FilterOptions = {
  teachers: { id: string; name: string; lectures: number }[];
  subjects: { id: string; code: string; name: string; color: ColorToken; lectures: number }[];
  sections: { id: string; name: string }[];
  days: Day[];
  periods: Period[];
  groups: string[];
};

export type ClassSummary = {
  id: string;
  name: string;
  shortName: string;
  active: boolean;
  entryCount: number;
};

export type IntegrityIssue = {
  level: "error" | "warning";
  entity: string;
  id: string;
  message: string;
};

export type TimetableView = "grid" | "list" | "teachers";

export type RawDataset = {
  school: School;
  classes: ClassSummary[];
  currentClass: ClassRecord;
  days: Day[];
  sections: Section[];
  subjects: Subject[];
  teachers: Teacher[];
  entries: Entry[];
};

export type ResolvedDataset = {
  school: School;
  classId: string;
  classes: ClassSummary[];
  currentClass: ClassRecord;
  days: Day[];
  periods: Period[];
  sections: ResolvedSection[];
  subjects: Subject[];
  teachers: Teacher[];
  entries: ResolvedEntry[];
  issues: IntegrityIssue[];
};

export type TimetableResponse = {
  school: School;
  classId: string;
  classes: ClassSummary[];
  currentClass: ClassRecord;
  days: Day[];
  periods: Period[];
  sections: ResolvedSection[];
  subjects: Subject[];
  teachers: Teacher[];
  entries: ResolvedEntry[];
  stats: Stats;
  teacherLoad: TeacherLoadRow[];
  teacherAvailability: TeacherAvailabilityRow[];
  periodsPerDay: number;
  filters: Filters;
  filterOptions: FilterOptions;
  issues: IntegrityIssue[];
};
