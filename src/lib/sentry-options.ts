// Settings shared by every place that sends errors to Sentry: the browser, the
// Next.js server and the worker.
//
// With no DSN set, as on your computer and in tests, Sentry stays off: errors
// show in the terminal instead and use none of the Sentry quota. On Railway
// both values are set in .railway/railway.ts.
//
// Both are NEXT_PUBLIC_ so Next.js copies them into the browser code at build
// time. That only works for references written out in full, like the one below
// and the one in ./app-environment.ts.
import { appEnvironment } from "./app-environment";

export function sentryOptions(service: "web" | "worker") {
  return {
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: appEnvironment,
    // Which process the error came from, to filter by in Sentry
    initialScope: { tags: { service } },
    // Leave out IP addresses, cookies and request bodies, which can hold
    // guests' and owners' personal details
    sendDefaultPii: false,
    // No tracesSampleRate: performance tracing stays off to save quota
  };
}
