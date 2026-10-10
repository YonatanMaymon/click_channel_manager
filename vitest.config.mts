// @next/env is an older CommonJS package, so this .mts file can only take
// its default export and pull loadEnvConfig out of it.
import nextEnv from "@next/env";
import { defineConfig } from "vitest/config";

const { loadEnvConfig } = nextEnv;

// Vitest sets NODE_ENV to "test" before reading this file, so this loads
// .env.test (the test database) the same way Next.js would, and skips
// .env.local. Loading here, before any test starts, means every test sees it.
loadEnvConfig(process.cwd());

export default defineConfig({
  // Resolve "@/..." imports the same way tsconfig.json does
  resolve: { tsconfigPaths: true },
  test: {
    // Unit tests sit next to the code they test. e2e/ belongs to Playwright.
    include: ["src/**/*.test.{ts,tsx}"],
    // Brings the test database up to the latest migration before tests run
    globalSetup: ["src/test/global-setup.ts"],
    // Test files that share the database run one at a time, so one file
    // clearing a table can't break another file mid-test.
    fileParallelism: false,
  },
});
