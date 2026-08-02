import { randomUUID } from "node:crypto";

import { and, eq, gte, lt, sql } from "drizzle-orm";

import { getDb, schema } from "./client.js";

export const MAX_ATTEMPTS = 8;
export const WINDOW_MINUTES = 15;

function windowStart(): Date {
  return new Date(Date.now() - WINDOW_MINUTES * 60_000);
}

export async function recentFailures(client: string): Promise<number> {
  const [row] = await getDb()
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.accessAttempts)
    .where(
      and(
        eq(schema.accessAttempts.client, client),
        gte(schema.accessAttempts.at, windowStart()),
      ),
    );

  return row?.count ?? 0;
}

export async function recordFailure(client: string): Promise<void> {
  await getDb().insert(schema.accessAttempts).values({ id: randomUUID(), client });
}

export async function forgetOldFailures(): Promise<void> {
  await getDb()
    .delete(schema.accessAttempts)
    .where(lt(schema.accessAttempts.at, windowStart()));
}
