// Background worker: a separate process from the web app that runs scheduled
// and queued jobs with pg-boss. Run it with `pnpm worker:dev`.
import "./env"; // first, so .env is loaded before other modules read it
import "./sentry"; // second, so Sentry is running before any job starts

import * as Sentry from "@sentry/node";
import { PgBoss } from "pg-boss";

import { databaseUrl } from "@/db/url";
import { registerHeartbeat } from "./jobs/heartbeat";
import { registerSentryTest } from "./jobs/sentry-test";

async function main() {
  // pg-boss keeps its jobs in its own "pgboss" schema, which it creates and
  // upgrades on start. Our Drizzle migrations never touch it.
  const boss = new PgBoss(databaseUrl());
  // pg-boss's own errors, such as losing the database connection. Not job
  // errors: those are reported by reportFinalFailure (jobs/).
  boss.on("error", (error) => {
    console.error("[worker] pg-boss error:", error);
    Sentry.captureException(error);
  });
  // A warning's data says which queue it's about and by how much
  boss.on("warning", (warning) =>
    console.warn("[worker] pg-boss warning:", warning),
  );

  await boss.start();
  await registerHeartbeat(boss);
  await registerSentryTest(boss);
  console.log("[worker] started");

  // Railway sends SIGTERM before replacing the worker on a deploy; Ctrl+C sends
  // SIGINT. pg-boss then waits up to 30 seconds for running jobs to finish,
  // but Railway kills the process after a few seconds unless
  // RAILWAY_DEPLOYMENT_DRAINING_SECONDS is raised (see the Railway task in
  // PLAN.md).
  const stop = (signal: NodeJS.Signals) => {
    console.log(`[worker] ${signal} received, stopping`);
    boss
      .stop()
      // Send any errors still waiting to go to Sentry before the process ends
      .then(() => Sentry.close(2000))
      .catch(async (error) => {
        console.error("[worker] failed to stop cleanly:", error);
        Sentry.captureException(error);
        await Sentry.close(2000);
        process.exit(1);
      });
  };
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
}

main().catch(async (error) => {
  console.error("[worker] failed to start:", error);
  Sentry.captureException(error);
  // process.exit doesn't wait for the report to be sent, so wait up to 2 seconds
  await Sentry.close(2000);
  process.exit(1);
});
