import { afterEach, describe, expect, it, vi } from "vitest";

// appEnvironment is worked out once, when the module loads, so each test sets
// the variables and then loads a fresh copy
async function environmentWith(vars: {
  NEXT_PUBLIC_SENTRY_ENVIRONMENT?: string;
  NODE_ENV: string;
}) {
  vi.stubEnv(
    "NEXT_PUBLIC_SENTRY_ENVIRONMENT",
    vars.NEXT_PUBLIC_SENTRY_ENVIRONMENT,
  );
  vi.stubEnv("NODE_ENV", vars.NODE_ENV);
  vi.resetModules();
  return (await import("./app-environment")).appEnvironment;
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("appEnvironment", () => {
  it("uses the environment Railway sets", async () => {
    expect(
      await environmentWith({
        NEXT_PUBLIC_SENTRY_ENVIRONMENT: "staging",
        NODE_ENV: "production",
      }),
    ).toBe("staging");
  });

  it("is development on your own computer", async () => {
    expect(await environmentWith({ NODE_ENV: "development" })).toBe(
      "development",
    );
  });

  // The test error triggers open and the fake SMS sender is used everywhere
  // except staging and production, so a production build with the variable
  // missing must still count as production
  it("counts a production build with no environment set as production", async () => {
    expect(await environmentWith({ NODE_ENV: "production" })).toBe(
      "production",
    );
  });
});
