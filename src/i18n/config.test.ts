import { describe, expect, it } from "vitest";

import { defaultLocale, directionOf } from "./config";

describe("locales", () => {
  it("defaults to Hebrew", () => {
    expect(defaultLocale).toBe("he");
  });

  it("lays out Hebrew right to left and English left to right", () => {
    expect(directionOf("he")).toBe("rtl");
    expect(directionOf("en")).toBe("ltr");
  });
});
