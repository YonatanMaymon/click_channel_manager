// Next.js runs register() once when the server starts, before it handles any
// request. Errors in pages, route handlers and server actions on the server go
// to onRequestError. Browser errors are set up in ./instrumentation-client.ts.
import * as Sentry from "@sentry/nextjs";

import { sentryOptions } from "@/lib/sentry-options";

export function register() {
  Sentry.init(sentryOptions("web"));
}

export const onRequestError = Sentry.captureRequestError;
