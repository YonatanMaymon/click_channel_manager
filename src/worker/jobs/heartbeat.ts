import type { PgBoss } from "pg-boss";

import { reportJobFailure } from "../sentry";
import { setUpQueue } from "./queue";
import { reportFinalFailure } from "./report-final-failure";

const QUEUE = "heartbeat";

// Logs a line every minute. If it stops showing up in the worker's logs, the
// worker is down or scheduled jobs aren't running.
export async function registerHeartbeat(boss: PgBoss) {
  // No retries: next minute's heartbeat is the retry
  await setUpQueue(boss, QUEUE, { retryLimit: 0 });
  await boss.schedule(QUEUE, "* * * * *"); // every minute
  await boss.work(
    QUEUE,
    // Checking for new jobs every 30 seconds, rather than the default 2, is
    // plenty for one job a minute and saves database queries
    { pollingIntervalSeconds: 30, includeMetadata: true },
    reportFinalFailure(
      QUEUE,
      async () => {
        console.log(`[heartbeat] worker alive at ${new Date().toISOString()}`);
      },
      reportJobFailure,
    ),
  );
}
