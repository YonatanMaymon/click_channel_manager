import { defineConfig } from "@playwright/test";

const baseURL = "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  use: {
    baseURL,
    // Owners and guests use phones, so every test runs on a 375 px wide
    // touch screen (iPhone SE size)
    browserName: "chromium",
    viewport: { width: 375, height: 667 },
    isMobile: true,
    hasTouch: true,
    locale: "he-IL",
    timezoneId: "Asia/Jerusalem",
    // Save a step-by-step recording of failed tests: `pnpm exec playwright show-trace`
    trace: "retain-on-failure",
  },
  // Starts the dev server, or uses the one already running from `pnpm dev`
  webServer: {
    command: "pnpm dev",
    url: baseURL,
    reuseExistingServer: true,
  },
});
