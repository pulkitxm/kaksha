CREATE TABLE "class_subjects" (
	"class_id" text NOT NULL,
	"subject_id" text NOT NULL,
	CONSTRAINT "class_subjects_class_id_subject_id_pk" PRIMARY KEY("class_id","subject_id")
);
--> statement-breakpoint
CREATE TABLE "classes" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"short_name" text NOT NULL,
	"order" integer NOT NULL,
	"active" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "days" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"short" text NOT NULL,
	"order" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "entries" (
	"id" text PRIMARY KEY NOT NULL,
	"class_id" text NOT NULL,
	"section_id" text NOT NULL,
	"period_id" integer NOT NULL,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "entry_assignments" (
	"entry_id" text NOT NULL,
	"position" integer NOT NULL,
	"subject_id" text NOT NULL,
	"teacher_id" text,
	CONSTRAINT "entry_assignments_entry_id_position_pk" PRIMARY KEY("entry_id","position")
);
--> statement-breakpoint
CREATE TABLE "entry_days" (
	"entry_id" text NOT NULL,
	"day_id" integer NOT NULL,
	CONSTRAINT "entry_days_entry_id_day_id_pk" PRIMARY KEY("entry_id","day_id")
);
--> statement-breakpoint
CREATE TABLE "periods" (
	"class_id" text NOT NULL,
	"period_id" integer NOT NULL,
	"name" text NOT NULL,
	"label" text NOT NULL,
	CONSTRAINT "periods_class_id_period_id_pk" PRIMARY KEY("class_id","period_id")
);
--> statement-breakpoint
CREATE TABLE "school" (
	"id" text PRIMARY KEY DEFAULT 'default' NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"title" text NOT NULL,
	"session" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "section_electives" (
	"section_id" text NOT NULL,
	"subject_id" text NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "section_electives_section_id_subject_id_pk" PRIMARY KEY("section_id","subject_id")
);
--> statement-breakpoint
CREATE TABLE "sections" (
	"id" text PRIMARY KEY NOT NULL,
	"class_id" text NOT NULL,
	"name" text NOT NULL,
	"order" integer NOT NULL,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "subjects" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"group" text NOT NULL,
	"color" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teachers" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"short_name" text NOT NULL,
	"department" text,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
ALTER TABLE "class_subjects" ADD CONSTRAINT "class_subjects_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_subjects" ADD CONSTRAINT "class_subjects_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entries" ADD CONSTRAINT "entries_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entries" ADD CONSTRAINT "entries_section_id_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entry_assignments" ADD CONSTRAINT "entry_assignments_entry_id_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entry_assignments" ADD CONSTRAINT "entry_assignments_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entry_assignments" ADD CONSTRAINT "entry_assignments_teacher_id_teachers_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."teachers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entry_days" ADD CONSTRAINT "entry_days_entry_id_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entry_days" ADD CONSTRAINT "entry_days_day_id_days_id_fk" FOREIGN KEY ("day_id") REFERENCES "public"."days"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "periods" ADD CONSTRAINT "periods_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "section_electives" ADD CONSTRAINT "section_electives_section_id_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."sections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "section_electives" ADD CONSTRAINT "section_electives_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sections" ADD CONSTRAINT "sections_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "entries_class_idx" ON "entries" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "entries_section_period_idx" ON "entries" USING btree ("section_id","period_id");--> statement-breakpoint
CREATE INDEX "entry_assignments_teacher_idx" ON "entry_assignments" USING btree ("teacher_id");--> statement-breakpoint
CREATE INDEX "entry_assignments_subject_idx" ON "entry_assignments" USING btree ("subject_id");--> statement-breakpoint
CREATE INDEX "entry_days_day_idx" ON "entry_days" USING btree ("day_id");--> statement-breakpoint
CREATE INDEX "sections_class_idx" ON "sections" USING btree ("class_id");--> statement-breakpoint
CREATE UNIQUE INDEX "subjects_code_key" ON "subjects" USING btree ("code");