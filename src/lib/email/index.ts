// Sending email. Everything else in the app imports from here:
//
//   const email = createEmailProvider(emailConfig(process.env, appEnvironment),
//     Sentry.captureException);
//   await email.send({ to: "dana@gmail.com", subject: "...", text: "..." });
//
// Staging and production send through Resend; everywhere else uses the fake
// sender, which only prints the email. Same pattern as src/lib/sms.
import type { EmailProvider, ReportError } from "./email-provider";
import { createFakeEmailProvider } from "./fake";
import { createResendProvider } from "./resend";

export { toEmailAddress } from "./address";
export type { EmailMessage, EmailProvider } from "./email-provider";
export { EmailSendError, InvalidEmailError } from "./errors";
export { createFakeEmailProvider, type FakeEmailProvider } from "./fake";
export { createResendProvider } from "./resend";

export type EmailConfig =
  { kind: "fake" } | { kind: "resend"; apiKey: string; from: string };

// Set on Railway (.railway/railway.ts); see .env.example
const SETTINGS = ["RESEND_API_KEY", "EMAIL_FROM"] as const;

// Picks the sender by environment, never by which settings happen to be set.
// In staging and production a missing setting throws, which stops the app
// from starting, instead of quietly using the fake sender.
export function emailConfig(
  env: Record<string, string | undefined>,
  environment: string,
): EmailConfig {
  if (environment !== "staging" && environment !== "production") {
    return { kind: "fake" };
  }
  // Names only, never values: this message goes to the deploy logs
  const missing = SETTINGS.filter((name) => !env[name]);
  if (missing.length > 0) {
    throw new Error(
      `Email settings missing in ${environment}: ${missing.join(", ")}`,
    );
  }
  return {
    kind: "resend",
    apiKey: env.RESEND_API_KEY!,
    from: env.EMAIL_FROM!,
  };
}

export function createEmailProvider(
  config: EmailConfig,
  report: ReportError,
): EmailProvider {
  return config.kind === "resend"
    ? createResendProvider(config, report)
    : createFakeEmailProvider();
}
