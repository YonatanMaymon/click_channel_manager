// Sending SMS messages. Everything else in the app imports from here:
//
//   const sms = createSmsProvider(smsConfig(process.env, appEnvironment),
//     Sentry.captureException);
//   await sms.send("052-555-1234", "...");
//
// Staging and production send through 019; everywhere else uses the fake
// sender, which only prints the message.
import { createFakeSmsProvider } from "./fake";
import { create019Provider } from "./sms019";
import type { ReportError, SmsProvider } from "./sms-provider";

export { InvalidPhoneError, SmsSendError } from "./errors";
export { createFakeSmsProvider, type FakeSmsProvider } from "./fake";
export { toSmsPhone } from "./phone";
export { create019Provider } from "./sms019";
export type { ReportError, SmsProvider } from "./sms-provider";

export type SmsConfig =
  | { kind: "fake" }
  | { kind: "019"; username: string; token: string; source: string };

// Set on Railway (.railway/railway.ts); see .env.example
const SETTINGS = ["SMS_019_USERNAME", "SMS_019_TOKEN", "SMS_SENDER"] as const;

// Picks the sender by environment, never by which settings happen to be set.
// In staging and production a missing setting throws, which stops the app
// from starting: a deploy that forgot the token fails where you see it,
// instead of quietly using the fake sender while owners never get their codes.
export function smsConfig(
  env: Record<string, string | undefined>,
  environment: string,
): SmsConfig {
  if (environment !== "staging" && environment !== "production") {
    return { kind: "fake" };
  }
  // Names only, never values: this message goes to the deploy logs
  const missing = SETTINGS.filter((name) => !env[name]);
  if (missing.length > 0) {
    throw new Error(
      `SMS settings missing in ${environment}: ${missing.join(", ")}`,
    );
  }
  return {
    kind: "019",
    username: env.SMS_019_USERNAME!,
    token: env.SMS_019_TOKEN!,
    source: env.SMS_SENDER!,
  };
}

export function createSmsProvider(
  config: SmsConfig,
  report: ReportError,
): SmsProvider {
  return config.kind === "019"
    ? create019Provider(config, report)
    : createFakeSmsProvider();
}
