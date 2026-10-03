import type { PgBoss } from "pg-boss";

const QUEUE = "heartbeat";

// Logs a line every minute. If it stops showing up in the worker's logs, the
// worker is down or scheduled jobs aren't running.
export async function registerHeartbeat(boss: PgBoss) {
  await boss.createQueue(QUEUE);
  await boss.schedule(QUEUE, "* * * * *"); // every minute
  // Checking for new jobs every 30 seconds, rather than the default 2, is
  // plenty for one job a minute and saves database queries.
  await boss.work(QUEUE, { pollingIntervalSeconds: 30 }, async () => {
    console.log(`[heartbeat] worker alive at ${new Date().toISOString()}`);
  });
}
