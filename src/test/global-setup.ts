import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

import { databaseUrl } from "../db/url";

// Runs once before all tests. Tests clear tables freely, so refuse to run
// against anything but a database whose name ends in "_test": if .env.test
// failed to load, this stops the run instead of wiping development data.
export async function setup() {
  const url = databaseUrl();
  const name = new URL(url).pathname.slice(1);
  if (!name.endsWith("_test")) {
    throw new Error(
      `Tests must use a database whose name ends in "_test", got "${name}". Check .env.test.`,
    );
  }

  const pool = new Pool({ connectionString: url });
  try {
    await migrate(drizzle({ client: pool }), {
      migrationsFolder: "src/db/migrations",
    });
  } catch (error) {
    throw new Error(
      "Could not migrate the test database. Is it running? Try `pnpm db:start`.",
      { cause: error },
    );
  } finally {
    await pool.end();
  }
}
