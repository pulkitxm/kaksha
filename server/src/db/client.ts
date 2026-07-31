import { getEnv } from "../env.js";
import { connect, type AnyDatabase } from "./connect.js";
import * as schema from "./schema.js";

let database: AnyDatabase | null = null;

export function getDb(): AnyDatabase {
  database ??= connect(getEnv().DATABASE_URL).db;
  return database;
}

export { schema };
