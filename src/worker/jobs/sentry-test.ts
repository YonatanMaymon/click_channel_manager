import type { PgBoss } from "pg-boss";

import { reportJobFailure } from "../sentry";
import { setUpQueue } from "./queue";
import { reportFinalFailure } from "./report-final-failure";

export const SENTRY_TEST_QUEUE = "sentry-test";

// Proves that worker errors reach Sentry. `pnpm worker:test-error` sends one
// job here (see ../send-test-error.ts). It fails on every attempt, so Sentry
// should get exactly one report, after the third attempt, about half a
// minute to two minutes later.
export async function registerSentryTest(boss: PgBoss) {
  await setUpQueue(boss, SENTRY_TEST_QUEUE, { retryLimit: 2, retryDelay: 5 });
  await boss.work(
    SENTRY_TEST_QUEUE,
    // Jobs here are rare, so check for them only every 30 seconds
    { pollingIntervalSeconds: 30, includeMetadata: true },
    reportFinalFailure(
      SENTRY_TEST_QUEUE,
      async (job) => {
        console.log(`[sentry-test] attempt ${job.retryCount + 1}, failing`);
        throw new Error("Sentry test error from the worker");
      },
      reportJobFailure,
    ),
  );
}
