import "server-only";

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { z } from "zod";

import * as schema from "./schema";

const envSchema = z.object({
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required")
    .refine(
      (value) => value.startsWith("postgres://") || value.startsWith("postgresql://"),
      "DATABASE_URL must be a postgres connection string",
    ),
});

const parsed = envSchema.safeParse({ DATABASE_URL: process.env.DATABASE_URL });

if (!parsed.success) {
  throw new Error(
    `Invalid database environment: ${parsed.error.issues
      .map((issue) => issue.message)
      .join(", ")}`,
  );
}

const sql = neon(parsed.data.DATABASE_URL);

export const db = drizzle(sql, { schema, casing: "snake_case" });

export type Database = typeof db;
export { schema };
