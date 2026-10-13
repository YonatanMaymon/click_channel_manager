import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { InvalidPhoneError, SmsSendError } from "./errors";
import { create019Provider } from "./sms019";

const settings = { username: "click", token: "tok-123", source: "Click" };

// Stands in for the real fetch, so no request ever leaves the computer.
// Each test says what 019 "answers".
const fetchMock = vi.fn<typeof fetch>();

// 019 answers every request with HTTP 200 and a JSON body; "status" 0 means
// the message was accepted, any other number is an error code
function answer(body: unknown, httpStatus = 200) {
  fetchMock.mockResolvedValue(
    new Response(JSON.stringify(body), { status: httpStatus }),
  );
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("019 SMS provider", () => {
  it("sends the message to 019 and reports nothing when 019 accepts it", async () => {
    answer({ status: 0, message: "SMS will be sent", shipment_id: "777" });
    const report = vi.fn();

    await create019Provider(settings, report).send(
      "+972 52 555 1234",
      "קוד הכניסה שלך: 123456",
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://019sms.co.il/api");
    expect(init?.method).toBe("POST");
    expect(new Headers(init?.headers).get("Authorization")).toBe(
      "Bearer tok-123",
    );
    expect(new Headers(init?.headers).get("Content-Type")).toBe(
      "application/json",
    );
    expect(JSON.parse(init?.body as string)).toEqual({
      sms: {
        user: { username: "click" },
        source: "Click",
        destinations: { phone: [{ _: "0525551234" }] },
        message: "קוד הכניסה שלך: 123456",
      },
    });
    expect(report).not.toHaveBeenCalled();
  });

  it("uses 019's test address, which sends nothing, in dry-run mode", async () => {
    answer({ status: 0, message: "SMS will be sent" });

    await create019Provider({ ...settings, dryRun: true }, vi.fn()).send(
      "0525551234",
      "test",
    );

    expect(fetchMock.mock.calls[0][0]).toBe("https://019sms.co.il/api/test");
  });

  // The user's mistake: they get a message to fix it, and there's nothing
  // for us to look at in Sentry
  it("rejects a bad number without calling 019 or reporting", async () => {
    const report = vi.fn();

    await expect(
      create019Provider(settings, report).send("03-123-4567", "hi"),
    ).rejects.toThrow(InvalidPhoneError);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(report).not.toHaveBeenCalled();
  });

  it("treats 019's 'destination too short or too long' (status 9) as a bad number, without reporting", async () => {
    answer({ status: 9, message: "destination too short or too long" });
    const report = vi.fn();

    await expect(
      create019Provider(settings, report).send("0525551234", "hi"),
    ).rejects.toThrow(InvalidPhoneError);

    expect(report).not.toHaveBeenCalled();
  });

  // Our problems: the message didn't go out and someone has to fix something
  it.each([
    [3, "invalid token"],
    [10, "expired token"],
    [4, "not enough credit"],
    [515, "unverified source"],
  ])(
    "fails and reports once when 019 answers status %i (%s)",
    async (status, message) => {
      answer({ status, message });
      const report = vi.fn();

      await expect(
        create019Provider(settings, report).send("0525551234", "hi"),
      ).rejects.toThrow(SmsSendError);

      expect(report).toHaveBeenCalledTimes(1);
      expect(report.mock.calls[0][0]).toBeInstanceOf(SmsSendError);
    },
  );

  it("fails and reports when 019 answers with an HTTP error", async () => {
    fetchMock.mockResolvedValue(
      new Response("Service Unavailable", { status: 503 }),
    );
    const report = vi.fn();

    await expect(
      create019Provider(settings, report).send("0525551234", "hi"),
    ).rejects.toThrow(SmsSendError);
    expect(report).toHaveBeenCalledTimes(1);
  });

  it("fails and reports when 019's answer isn't JSON", async () => {
    fetchMock.mockResolvedValue(
      new Response("<html>maintenance</html>", { status: 200 }),
    );
    const report = vi.fn();

    await expect(
      create019Provider(settings, report).send("0525551234", "hi"),
    ).rejects.toThrow(SmsSendError);
    expect(report).toHaveBeenCalledTimes(1);
  });

  it("fails and reports when the network is down", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));
    const report = vi.fn();

    await expect(
      create019Provider(settings, report).send("0525551234", "hi"),
    ).rejects.toThrow(SmsSendError);
    expect(report).toHaveBeenCalledTimes(1);
  });

  it("gives up after 10 seconds when 019 doesn't answer, and reports", async () => {
    vi.useFakeTimers();
    // 019 never answers; the request only ends when our side cancels it
    fetchMock.mockImplementation(
      (_, init) =>
        new Promise((_, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(init.signal?.reason),
          );
        }),
    );
    const report = vi.fn();

    const sending = create019Provider(settings, report).send(
      "0525551234",
      "hi",
    );
    const outcome = sending.then(
      () => "sent",
      (error: unknown) => error,
    );

    await vi.advanceTimersByTimeAsync(9_999);
    expect(report).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(await outcome).toBeInstanceOf(SmsSendError);
    expect(report).toHaveBeenCalledTimes(1);
  });

  // Error messages end up in Sentry and logs, which must never hold the key
  it("never puts the token in the error", async () => {
    answer({ status: 10, message: "Expired API token" });
    const report = vi.fn();

    const error = await create019Provider(settings, report)
      .send("0525551234", "hi")
      .catch((e: unknown) => e);

    expect(String((error as Error).message)).not.toContain("tok-123");
  });
});
