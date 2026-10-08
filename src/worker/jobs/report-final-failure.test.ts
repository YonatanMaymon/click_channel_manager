import type { JobWithMetadata } from "pg-boss";
import { describe, expect, it, vi } from "vitest";

import { reportFinalFailure } from "./report-final-failure";

// A job as pg-boss hands it to a worker. retryCount is how many times it has
// already been retried (0 on the first attempt); retryLimit is how many
// retries it gets after that first attempt.
function fakeJob(retryCount: number, retryLimit: number) {
  return {
    id: "job-1",
    name: "ical-import",
    data: { unitId: "unit-7" },
    retryCount,
    retryLimit,
  } as JobWithMetadata<{ unitId: string }>;
}

const failing = (error: unknown) => async () => {
  throw error;
};

describe("reportFinalFailure", () => {
  it("passes each job to the handler and reports nothing when it succeeds", async () => {
    const handler = vi.fn(async () => {});
    const report = vi.fn();
    const job = fakeJob(0, 2);

    await reportFinalFailure("ical-import", handler, report)([job]);

    expect(handler).toHaveBeenCalledWith(job);
    expect(report).not.toHaveBeenCalled();
  });

  it("doesn't report a failure that will be retried, but still fails the job", async () => {
    const error = new Error("portal timed out");
    const report = vi.fn();
    const run = reportFinalFailure("ical-import", failing(error), report);

    // Attempts 1 and 2 of 3: pg-boss will try again
    await expect(run([fakeJob(0, 2)])).rejects.toBe(error);
    await expect(run([fakeJob(1, 2)])).rejects.toBe(error);

    expect(report).not.toHaveBeenCalled();
  });

  it("reports once when the last attempt fails, and still fails the job", async () => {
    const error = new Error("portal timed out");
    const report = vi.fn();
    const run = reportFinalFailure("ical-import", failing(error), report);

    // Attempt 3 of 3: no retries left
    await expect(run([fakeJob(2, 2)])).rejects.toBe(error);

    expect(report).toHaveBeenCalledTimes(1);
    expect(report).toHaveBeenCalledWith(error, {
      queue: "ical-import",
      jobId: "job-1",
      attempts: 3,
    });
  });

  it("reports the first failure of a job that has no retries", async () => {
    const error = new Error("boom");
    const report = vi.fn();
    const run = reportFinalFailure("heartbeat", failing(error), report);

    await expect(run([fakeJob(0, 0)])).rejects.toBe(error);

    expect(report).toHaveBeenCalledWith(error, {
      queue: "heartbeat",
      jobId: "job-1",
      attempts: 1,
    });
  });

  it("reports and rethrows values that aren't Error objects", async () => {
    const report = vi.fn();
    const run = reportFinalFailure("ical-import", failing("boom"), report);

    await expect(run([fakeJob(2, 2)])).rejects.toBe("boom");

    expect(report).toHaveBeenCalledWith("boom", expect.anything());
  });

  it("fails the job with the original error even if reporting itself fails", async () => {
    const error = new Error("portal timed out");
    const report = vi.fn(() => {
      throw new Error("Sentry is down");
    });
    const run = reportFinalFailure("ical-import", failing(error), report);

    await expect(run([fakeJob(2, 2)])).rejects.toBe(error);
  });
});
