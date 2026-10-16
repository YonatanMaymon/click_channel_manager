import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createEmailProvider,
  createFakeEmailProvider,
  emailConfig,
  InvalidEmailError,
} from ".";

const allResendSettings = {
  RESEND_API_KEY: "re_123",
  EMAIL_FROM: "onboarding@resend.dev",
};

describe("emailConfig", () => {
  // Your computer and tests never send a real email, even if .env holds a key
  it.each(["development", "test"])(
    "uses the fake sender in %s",
    (environment) => {
      expect(emailConfig({}, environment)).toEqual({ kind: "fake" });
      expect(emailConfig(allResendSettings, environment)).toEqual({
        kind: "fake",
      });
    },
  );

  it.each(["staging", "production"])(
    "uses Resend in %s when every setting is there",
    (environment) => {
      expect(emailConfig(allResendSettings, environment)).toEqual({
        kind: "resend",
        apiKey: "re_123",
        from: "onboarding@resend.dev",
      });
    },
  );

  // Fail safe, same as SMS: a forgotten setting stops the deploy
  it("refuses to start when a setting is missing or empty, naming each one", () => {
    expect(() => emailConfig({}, "staging")).toThrow(
      /RESEND_API_KEY.*EMAIL_FROM/,
    );
    expect(() =>
      emailConfig({ ...allResendSettings, EMAIL_FROM: "" }, "production"),
    ).toThrow(/EMAIL_FROM/);
  });

  it("never puts a setting's value in the error", () => {
    let message = "";
    try {
      emailConfig({ ...allResendSettings, EMAIL_FROM: "" }, "production");
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).not.toContain("re_123");
  });
});

describe("createEmailProvider", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ id: "1" }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const message = { to: "dana@gmail.com", subject: "s", text: "t" };

  it("sends through Resend for a Resend config", async () => {
    const provider = createEmailProvider(
      { kind: "resend", apiKey: "re_123", from: "a@b.com" },
      vi.fn(),
    );
    await provider.send(message);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("sends nothing for a fake config", async () => {
    await createEmailProvider({ kind: "fake" }, vi.fn()).send(message);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("fake email provider", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("keeps each message, with the cleaned-up address", async () => {
    const fake = createFakeEmailProvider();

    await fake.send({ to: "Dana@Gmail.com", subject: "קוד", text: "123456" });

    expect(fake.sent).toEqual([
      { to: "dana@gmail.com", subject: "קוד", text: "123456" },
    ]);
  });

  // So you can copy the code from the terminal while developing
  it("prints the message in the terminal", async () => {
    await createFakeEmailProvider().send({
      to: "dana@gmail.com",
      subject: "קוד",
      text: "הקוד: 654321",
    });

    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining("הקוד: 654321"),
    );
  });

  it("rejects a bad address, like Resend would", async () => {
    const fake = createFakeEmailProvider();

    await expect(
      fake.send({ to: "dana@", subject: "s", text: "t" }),
    ).rejects.toThrow(InvalidEmailError);
    expect(fake.sent).toEqual([]);
  });
});
