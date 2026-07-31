import { neonConfig, Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";

import { getEnv } from "../env.js";
import * as schema from "./schema.js";

if (typeof globalThis.WebSocket === "undefined") {
  neonConfig.webSocketConstructor = ws;
}

type DrizzleDatabase = ReturnType<typeof drizzle<typeof schema>>;

let pool: Pool | null = null;
let database: DrizzleDatabase | null = null;

export function getDb(): DrizzleDatabase {
  if (database) return database;

  pool = new Pool({ connectionString: getEnv().DATABASE_URL });
  database = drizzle(pool, { schema, casing: "snake_case" });
  return database;
}

export { schema };
