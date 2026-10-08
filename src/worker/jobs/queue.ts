import type { PgBoss, QueueOptions } from "pg-boss";

type RetryOptions = Pick<
  QueueOptions,
  "retryLimit" | "retryDelay" | "retryBackoff"
>;

// Creates the queue, or updates it if it already exists. createQueue alone
// leaves an existing queue's settings as they were, so a change to the retry
// settings here would never reach a database that already has the queue.
export async function setUpQueue(
  boss: PgBoss,
  name: string,
  options: RetryOptions,
) {
  await boss.createQueue(name, options);
  await boss.updateQueue(name, options);
}
