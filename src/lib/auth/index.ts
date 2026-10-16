// The app's login setup: Better Auth with the real senders for this
// environment (src/lib/sms, src/lib/email) and its settings (./config.ts).
// Server code only: pages, server actions and the /api/auth route.
import * as Sentry from "@sentry/nextjs";

import { appEnvironment } from "@/lib/app-environment";
import { createEmailProvider, emailConfig } from "@/lib/email";
import { createSmsProvider, smsConfig } from "@/lib/sms";

import { authConfig } from "./config";
import { createAuth, type Auth } from "./create-auth";

let instance: Auth | undefined;

// Built on first use, not when this file loads: `next build` loads every
// route without the staging/production settings, and the settings checks
// would stop the build. The server still checks them at start
// (src/instrumentation.ts).
export function getAuth(): Auth {
  instance ??= createAuth({
    sms: createSmsProvider(
      smsConfig(process.env, appEnvironment),
      Sentry.captureException,
    ),
    email: createEmailProvider(
      emailConfig(process.env, appEnvironment),
      Sentry.captureException,
    ),
    ...authConfig(process.env, appEnvironment),
  });
  return instance;
}

export { authConfig } from "./config";
export type { Auth } from "./create-auth";
export * from "./email";
export * from "./login";
