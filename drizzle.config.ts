import { defineConfig } from "drizzle-kit";

import { databaseUrl } from "./src/db/url";

// drizzle-kit loads .env by itself before reading this file, so its commands
// use the development database unless DATABASE_URL is set explicitly.
// It never reads .env.test; the test setup migrates the test database itself.
if (process.env.NODE_ENV === "test") {
  throw new Error(
    "drizzle-kit ignores .env.test and would use the development database. " +
      "Set DATABASE_URL explicitly to target another database.",
  );
}

export default defineConfig({
  dialect: "postgresql",
  // The index file only, not the whole folder, so the tests that sit next
  // to each table aren't loaded as schema
  schema: "./src/db/schema/index.ts",
  out: "./src/db/migrations",
  dbCredentials: { url: databaseUrl() },
  // camelCase in TypeScript, snake_case column names in the database
  casing: "snake_case",
  strict: true,
  verbose: true,
});
