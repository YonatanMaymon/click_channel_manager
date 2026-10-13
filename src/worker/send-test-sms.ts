// Checks the real 019 connection by sending one SMS. Not part of `pnpm test`,
// because every message costs money. Run it by hand:
//
//   pnpm sms:test-send 052-555-1234          sends a real SMS to that number
//   pnpm sms:test-send 052-555-1234 --dry    019 checks the request, sends nothing
//
// Uses SMS_019_USERNAME, SMS_019_TOKEN and SMS_SENDER from .env, whatever the
// environment. On staging, run it inside a service with `railway ssh`.
import "./env"; // first, so .env is loaded before other modules read it

import { create019Provider } from "@/lib/sms";

async function main() {
  const [phone, flag] = process.argv.slice(2);
  const { SMS_019_USERNAME, SMS_019_TOKEN, SMS_SENDER } = process.env;
  if (!phone || (flag && flag !== "--dry")) {
    console.error("usage: pnpm sms:test-send <phone> [--dry]");
    process.exit(1);
  }
  if (!SMS_019_USERNAME || !SMS_019_TOKEN || !SMS_SENDER) {
    console.error(
      "[sms-test] set SMS_019_USERNAME, SMS_019_TOKEN and SMS_SENDER in .env",
    );
    process.exit(1);
  }

  const dryRun = flag === "--dry";
  const sms = create019Provider(
    {
      username: SMS_019_USERNAME,
      token: SMS_019_TOKEN,
      source: SMS_SENDER,
      dryRun,
    },
    // No Sentry here: the error is printed below
    () => {},
  );
  await sms.send(phone, "בדיקת SMS מקליק: אם קיבלת את זה, החיבור ל-019 עובד");
  console.log(
    dryRun
      ? "[sms-test] 019 accepted the request (dry run, nothing sent)"
      : `[sms-test] 019 accepted the message to ${phone}`,
  );
}

main().catch((error) => {
  console.error("[sms-test] failed:", error);
  process.exit(1);
});
