// The whole Railway project, described in code: web app, worker and Postgres,
// all in EU West (Amsterdam). Preview changes with `railway config plan` and
// apply them with `railway config apply`; both act on the linked environment
// (`railway environment <name>`), so staging and production get the same setup.
// Anything removed from this file is deleted from Railway on the next apply.
import {
  defineRailway,
  github,
  postgres,
  preserve,
  project,
  service,
  volume,
} from "railway/iac";

const REGION = "europe-west4-drams3a"; // EU West, Amsterdam: closest to Israel

// One copy of each app service, in REGION only. Railway merges this with the
// regions a service already has, so `sfo` (California, where the services were
// first created) is set to null to remove it.
const ONE_REPLICA_IN_EU = { [REGION]: { numReplicas: 1 }, sfo: null };

// Sentry (error tracking), from the project's settings on sentry.io. None of
// these are secret: the DSN is sent to every visitor's browser anyway. Until
// the DSN is filled in, Sentry stays off.
const SENTRY_DSN =
  "https://551739726ab10f2b356707f7fbb8e3c2@o4512210084691968.ingest.de.sentry.io/4512212543733840"; // Settings > Projects > (project) > Client Keys (DSN)
const SENTRY_ORG = "yehonatan-maymon"; // the organization slug, as in <slug>.sentry.io
const SENTRY_PROJECT = "javascript-nextjs"; // the project slug

export default defineRailway((ctx) => {
  const repo = github("YonatanMaymon/click_channel_manager", {
    branch: "phase-0-foundation",
    checkSuites: false,
  });

  // Read by src/lib/sentry-options.ts in both the web app and the worker. The
  // environment name lets Sentry show staging and production errors apart.
  const sentryEnv = {
    NEXT_PUBLIC_SENTRY_DSN: SENTRY_DSN,
    NEXT_PUBLIC_SENTRY_ENVIRONMENT: ctx.isEnvironment("production")
      ? "production"
      : "staging",
  };

  // Postgres 18 (same major version as compose.yaml), with its data volume.
  // Imported as-is from Railway; don't change the volume or data is at risk.
  const db = postgres("Postgres", { region: REGION });
  db.networking = { privateNetworkEndpoint: "postgres" };
  const dbVolume = volume("postgres-volume", {
    alerts: { usage: { "100": {}, "80": {}, "95": {} } },
    allowOnlineResize: true,
    region: REGION,
    sizeMB: 500,
  });

  const web = service("web", {
    source: repo,
    build: "pnpm build",
    start: "pnpm start",
    // Runs before the new version goes live; if a migration fails, the deploy
    // stops and the old version keeps serving. Only web migrates, so two
    // services never run migrations at the same time.
    preDeploy: "pnpm db:migrate",
    // Traffic switches to a new deploy only once this answers 200, which needs
    // a working database connection (src/app/api/health/route.ts)
    healthcheck: "/api/health",
    healthcheckTimeout: 120,
    deploy: {
      restartPolicyType: "ON_FAILURE",
      restartPolicyMaxRetries: 5,
      multiRegionConfig: ONE_REPLICA_IN_EU,
    },
    env: {
      DATABASE_URL: db.env.DATABASE_URL, // private network address
      ...sentryEnv,
      // For uploading source maps during `pnpm build` (next.config.ts)
      SENTRY_ORG,
      SENTRY_PROJECT,
      // Secret, so it's not in this file: set it by hand in Railway, on the web
      // service in each environment. preserve() keeps the value already there.
      SENTRY_AUTH_TOKEN: preserve(),
    },
  });

  const worker = service("worker", {
    source: repo,
    // The worker runs TypeScript directly with tsx, so skip `next build`
    build: "echo 'worker runs TypeScript directly with tsx; nothing to build'",
    start: "pnpm worker:start",
    deploy: {
      // Time between SIGTERM and SIGKILL on a deploy, so pg-boss can finish
      // running jobs (src/worker/index.ts)
      drainingSeconds: 30,
      restartPolicyType: "ON_FAILURE",
      restartPolicyMaxRetries: 10,
      multiRegionConfig: ONE_REPLICA_IN_EU,
    },
    env: { DATABASE_URL: db.env.DATABASE_URL, ...sentryEnv },
  });

  return project("click-chanel_manager", {
    resources: [db, dbVolume, web, worker],
  });
});
