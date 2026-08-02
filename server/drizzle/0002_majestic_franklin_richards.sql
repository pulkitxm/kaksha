CREATE TABLE "access_attempts" (
	"id" text PRIMARY KEY NOT NULL,
	"client" text NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "access_attempts_client_at_idx" ON "access_attempts" USING btree ("client","at");