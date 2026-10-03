import { defineConfig } from "vitest/config";

export default defineConfig({
  // Resolve "@/..." imports the same way tsconfig.json does
  resolve: { tsconfigPaths: true },
  test: {
    // Unit tests sit next to the code they test. e2e/ belongs to Playwright.
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
