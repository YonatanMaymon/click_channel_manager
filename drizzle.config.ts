import { defineConfig } from "drizzle-kit";

// drizzle-kit loads .env by itself before reading this file, so its commands
// use the development database unless DATABASE_URL is set explicitly.
// It never reads .env.test; the test setup migrates the test database itself.
if (process.env.NODE_ENV === "test") {
  throw new Error(
    "drizzle-kit ignores .env.test and would use the development database. " +
      "Set DATABASE_URL explicitly to target another database.",
  );
}

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL is not set. Copy .env.example to .env.");
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema",
  out: "./src/db/migrations",
  dbCredentials: { url },
  // camelCase in TypeScript, snake_case column names in the database
  casing: "snake_case",
  strict: true,
  verbose: true,
});
