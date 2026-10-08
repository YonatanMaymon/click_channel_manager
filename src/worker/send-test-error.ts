// Sends one job that always fails to the worker, to check that worker errors
// reach Sentry. Run it with `pnpm worker:test-error`; on staging, run it inside
// the worker service with `railway ssh` (see the Railway section of README.md).
import "./env"; // first, so .env is loaded before other modules read it

import { PgBoss } from "pg-boss";

import { databaseUrl } from "@/db/url";
import { sentryEnvironment } from "@/lib/sentry-options";
import { SENTRY_TEST_QUEUE } from "./jobs/sentry-test";

async function main() {
  // A test error in production would look like a real problem to whoever reads it
  if (sentryEnvironment === "production") {
    console.error("[sentry-test] refusing to run in production; use staging");
    process.exit(1);
  }

  // Only sends a job: no scheduling or maintenance, which the worker does
  const boss = new PgBoss({
    connectionString: databaseUrl(),
    schedule: false,
    supervise: false,
  });
  await boss.start();
  const id = await boss.send(SENTRY_TEST_QUEUE);
  console.log(
    `[sentry-test] sent job ${id} to "${SENTRY_TEST_QUEUE}" (environment: ${sentryEnvironment})`,
  );
  await boss.stop();
}

main().catch((error) => {
  console.error("[sentry-test] failed:", error);
  process.exit(1);
});
