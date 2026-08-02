CREATE TABLE "notes" (
	"id" text PRIMARY KEY NOT NULL,
	"class_id" text,
	"title" text NOT NULL,
	"html" text DEFAULT '' NOT NULL,
	"preview" text DEFAULT '' NOT NULL,
	"pinned" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notes_class_idx" ON "notes" USING btree ("class_id");