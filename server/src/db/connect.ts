import { neonConfig, Pool as NeonPool } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless";
import { drizzle as drizzleNode } from "drizzle-orm/node-postgres";
import pg from "pg";
import ws from "ws";

import * as schema from "./schema.js";

export type AnyDatabase =
  | ReturnType<typeof drizzleNeon<typeof schema>>
  | ReturnType<typeof drizzleNode<typeof schema>>;

function isNeonUrl(url: string): boolean {
  return url.includes("neon.tech") || url.includes("neon.build");
}

export function connect(url: string): { db: AnyDatabase; close: () => Promise<void> } {
  if (isNeonUrl(url)) {
    if (typeof globalThis.WebSocket === "undefined") {
      neonConfig.webSocketConstructor = ws;
    }
    const pool = new NeonPool({ connectionString: url });
    return {
      db: drizzleNeon(pool, { schema, casing: "snake_case" }),
      close: () => pool.end(),
    };
  }

  const pool = new pg.Pool({ connectionString: url });
  return {
    db: drizzleNode(pool, { schema, casing: "snake_case" }),
    close: () => pool.end(),
  };
}
