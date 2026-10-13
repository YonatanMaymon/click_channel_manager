import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createFakeSmsProvider,
  createSmsProvider,
  InvalidPhoneError,
  smsConfig,
} from ".";

const all019Settings = {
  SMS_019_USERNAME: "click",
  SMS_019_TOKEN: "tok-123",
  SMS_SENDER: "Click",
};

describe("smsConfig", () => {
  // Your computer and tests never send a real SMS, even if .env holds a token
  it.each(["development", "test"])(
    "uses the fake sender in %s",
    (environment) => {
      expect(smsConfig({}, environment)).toEqual({ kind: "fake" });
      expect(smsConfig(all019Settings, environment)).toEqual({ kind: "fake" });
    },
  );

  it.each(["staging", "production"])(
    "uses 019 in %s when every setting is there",
    (environment) => {
      expect(smsConfig(all019Settings, environment)).toEqual({
        kind: "019",
        username: "click",
        token: "tok-123",
        source: "Click",
      });
    },
  );

  // Fail safe: a forgotten setting must stop the deploy, not silently fall
  // back to the fake sender so owners never get their codes
  it("refuses to start in production when the token is missing, and names it", () => {
    const withoutToken: Record<string, string> = { ...all019Settings };
    delete withoutToken.SMS_019_TOKEN;
    expect(() => smsConfig(withoutToken, "production")).toThrow(
      /SMS_019_TOKEN/,
    );
  });

  it("counts an empty setting as missing", () => {
    expect(() =>
      smsConfig({ ...all019Settings, SMS_SENDER: "" }, "staging"),
    ).toThrow(/SMS_SENDER/);
  });

  it("names every missing setting at once", () => {
    expect(() => smsConfig({}, "staging")).toThrow(
      /SMS_019_USERNAME.*SMS_019_TOKEN.*SMS_SENDER/,
    );
  });

  it("never puts a setting's value in the error", () => {
    let message = "";
    try {
      smsConfig({ ...all019Settings, SMS_019_USERNAME: "" }, "production");
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toMatch(/SMS_019_USERNAME/);
    expect(message).not.toContain("tok-123");
  });
});

describe("createSmsProvider", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ status: 0 }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("sends through 019 for a 019 config", async () => {
    const provider = createSmsProvider(
      { kind: "019", username: "click", token: "tok-123", source: "Click" },
      vi.fn(),
    );
    await provider.send("0525551234", "hi");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("sends nothing for a fake config", async () => {
    const provider = createSmsProvider({ kind: "fake" }, vi.fn());
    await provider.send("0525551234", "hi");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("fake SMS provider", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("keeps each message, with the number in the same form 019 gets", async () => {
    const fake = createFakeSmsProvider();

    await fake.send("+972 52 555 1234", "קוד הכניסה שלך: 123456");

    expect(fake.sent).toEqual([
      { phone: "0525551234", text: "קוד הכניסה שלך: 123456" },
    ]);
  });

  // So you can copy the login code from the terminal while developing
  it("prints the message in the terminal", async () => {
    await createFakeSmsProvider().send("0525551234", "קוד: 654321");

    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining("קוד: 654321"),
    );
  });

  // Behaves like 019 here, so a bad number fails the same way on your computer
  it("rejects a bad number", async () => {
    const fake = createFakeSmsProvider();

    await expect(fake.send("03-123-4567", "hi")).rejects.toThrow(
      InvalidPhoneError,
    );
    expect(fake.sent).toEqual([]);
  });
});
