// Background worker: a separate process from the web app that runs scheduled
// and queued jobs with pg-boss. Run it with `pnpm worker:dev`.
import "./env"; // first, so .env is loaded before other modules read it

import { PgBoss } from "pg-boss";

import { databaseUrl } from "@/db/url";
import { registerHeartbeat } from "./jobs/heartbeat";

async function main() {
  // pg-boss keeps its jobs in its own "pgboss" schema, which it creates and
  // upgrades on start. Our Drizzle migrations never touch it.
  const boss = new PgBoss(databaseUrl());
  boss.on("error", (error) => console.error("[worker] pg-boss error:", error));
  // A warning's data says which queue it's about and by how much
  boss.on("warning", (warning) =>
    console.warn("[worker] pg-boss warning:", warning),
  );

  await boss.start();
  await registerHeartbeat(boss);
  console.log("[worker] started");

  // Railway sends SIGTERM before replacing the worker on a deploy; Ctrl+C sends
  // SIGINT. pg-boss then waits up to 30 seconds for running jobs to finish,
  // but Railway kills the process after a few seconds unless
  // RAILWAY_DEPLOYMENT_DRAINING_SECONDS is raised (see the Railway task in
  // PLAN.md).
  const stop = (signal: NodeJS.Signals) => {
    console.log(`[worker] ${signal} received, stopping`);
    boss.stop().catch((error) => {
      console.error("[worker] failed to stop cleanly:", error);
      process.exit(1);
    });
  };
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
}

main().catch((error) => {
  console.error("[worker] failed to start:", error);
  process.exit(1);
});
