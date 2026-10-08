// Runs in the browser before the page becomes interactive, so Sentry catches
// errors from the very first moment. Server errors: see ./instrumentation.ts.
import * as Sentry from "@sentry/nextjs";

import { sentryOptions } from "@/lib/sentry-options";

Sentry.init(sentryOptions("web"));

// Lets Sentry know about page changes; without it, Sentry warns at build time
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
