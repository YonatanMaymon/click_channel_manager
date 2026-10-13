// Next.js runs register() once when the server starts, before it handles any
// request. Errors in pages, route handlers and server actions on the server go
// to onRequestError. Browser errors are set up in ./instrumentation-client.ts.
import * as Sentry from "@sentry/nextjs";

import { appEnvironment } from "@/lib/app-environment";
import { sentryOptions } from "@/lib/sentry-options";
import { smsConfig } from "@/lib/sms";

export function register() {
  Sentry.init(sentryOptions("web"));
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Throws if the SMS settings are missing in staging or production, so the
    // server doesn't start and the deploy fails (see src/lib/sms/index.ts)
    smsConfig(process.env, appEnvironment);
  }
}

export const onRequestError = Sentry.captureRequestError;
