import { describe, expect, it } from "vitest";

import { authConfig } from "./config";

const SECRET = "s".repeat(32);
const allSettings = {
  BETTER_AUTH_SECRET: SECRET,
  BETTER_AUTH_URL: "https://staging.example.com",
};

describe("authConfig", () => {
  // Nothing to set up on your computer or in tests
  it.each(["development", "test"])(
    "works in %s with no settings",
    (environment) => {
      const config = authConfig({}, environment);
      expect(config.secret.length).toBeGreaterThanOrEqual(32);
      expect(config.baseURL).toBeUndefined();
    },
  );

  it.each(["staging", "production"])(
    "uses the secret and address set in %s",
    (environment) => {
      expect(authConfig(allSettings, environment)).toEqual({
        secret: SECRET,
        baseURL: "https://staging.example.com",
      });
    },
  );

  // The secret signs every login cookie. A missing one must stop the deploy,
  // never fall back to the development secret that's in this repository.
  it("refuses to start in production when a setting is missing, naming each one", () => {
    expect(() => authConfig({}, "production")).toThrow(
      /BETTER_AUTH_SECRET.*BETTER_AUTH_URL/,
    );
    expect(() =>
      authConfig({ ...allSettings, BETTER_AUTH_SECRET: "" }, "staging"),
    ).toThrow(/BETTER_AUTH_SECRET/);
  });

  it("refuses a secret shorter than 32 characters", () => {
    expect(() =>
      authConfig({ ...allSettings, BETTER_AUTH_SECRET: "short" }, "staging"),
    ).toThrow(/BETTER_AUTH_SECRET/);
  });

  it("never puts the secret in the error", () => {
    let message = "";
    try {
      authConfig({ ...allSettings, BETTER_AUTH_URL: "" }, "production");
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toMatch(/BETTER_AUTH_URL/);
    expect(message).not.toContain(SECRET);
  });
});
