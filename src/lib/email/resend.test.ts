import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { EmailSendError, InvalidEmailError } from "./errors";
import { createResendProvider } from "./resend";

const settings = { apiKey: "re_123", from: "onboarding@resend.dev" };

const message = {
  to: "dana@gmail.com",
  subject: "קוד אימות",
  text: "הקוד שלך: 123456",
};

// Stands in for the real fetch, so no request ever leaves the computer.
// Each test says what Resend "answers".
const fetchMock = vi.fn<typeof fetch>();

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

describe("Resend email provider", () => {
  it("sends the message to Resend and reports nothing when Resend accepts it", async () => {
    answer({ id: "4ef9a417" });
    const report = vi.fn();

    await createResendProvider(settings, report).send(message);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init?.method).toBe("POST");
    expect(new Headers(init?.headers).get("Authorization")).toBe(
      "Bearer re_123",
    );
    expect(JSON.parse(init?.body as string)).toEqual({
      from: "onboarding@resend.dev",
      to: ["dana@gmail.com"],
      subject: "קוד אימות",
      text: "הקוד שלך: 123456",
    });
    expect(report).not.toHaveBeenCalled();
  });

  it("sends to the cleaned-up address", async () => {
    answer({ id: "4ef9a417" });

    await createResendProvider(settings, vi.fn()).send({
      ...message,
      to: " Dana@Gmail.com ",
    });

    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(init?.body as string).to).toEqual(["dana@gmail.com"]);
  });

  // The person's mistake, not ours: nothing is sent and Sentry hears nothing
  it("rejects a bad address without calling Resend or reporting it", async () => {
    const report = vi.fn();

    await expect(
      createResendProvider(settings, report).send({ ...message, to: "dana@" }),
    ).rejects.toThrow(InvalidEmailError);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(report).not.toHaveBeenCalled();
  });

  it("reports and throws when Resend refuses the request", async () => {
    // For example an expired or wrong API key
    answer({ statusCode: 401, message: "API key is invalid" }, 401);
    const report = vi.fn();

    const sending = createResendProvider(settings, report).send(message);

    await expect(sending).rejects.toThrow(EmailSendError);
    await expect(sending).rejects.toThrow(/401/);
    expect(report).toHaveBeenCalledTimes(1);
    expect(report.mock.calls[0][0]).toBeInstanceOf(EmailSendError);
  });

  it("reports and throws when the request fails", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));
    const report = vi.fn();

    await expect(
      createResendProvider(settings, report).send(message),
    ).rejects.toThrow(EmailSendError);
    expect(report).toHaveBeenCalledTimes(1);
  });

  // Otherwise the owner waits on a spinner that never stops
  it("gives up after 10 seconds without an answer", async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementation(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(new DOMException("aborted", "AbortError")),
          );
        }),
    );
    const report = vi.fn();

    const sending = createResendProvider(settings, report).send(message);
    const outcome = expect(sending).rejects.toThrow(/10 seconds/);
    await vi.advanceTimersByTimeAsync(10_000);

    await outcome;
    expect(report).toHaveBeenCalledTimes(1);
  });

  it("never puts the API key in the error", async () => {
    answer({ statusCode: 500, message: "internal" }, 500);
    const report = vi.fn();

    await createResendProvider(settings, report)
      .send(message)
      .catch(() => {});

    const error = report.mock.calls[0][0] as Error;
    expect(error.message).not.toContain("re_123");
  });
});
