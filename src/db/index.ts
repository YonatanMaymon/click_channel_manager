import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema";
import { databaseUrl } from "./url";

const connectionString = databaseUrl();

// The dev server re-runs modules on every change; reuse one connection pool
// so connections don't pile up.
const globalForDb = globalThis as unknown as { pool?: Pool };
const pool = globalForDb.pool ?? new Pool({ connectionString });
if (process.env.NODE_ENV !== "production") {
  globalForDb.pool = pool;
}

export const db = drizzle({ client: pool, schema, casing: "snake_case" });
