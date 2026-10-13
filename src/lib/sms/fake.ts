import { toSmsPhone } from "./phone";
import type { SmsProvider } from "./sms-provider";

export type FakeSmsProvider = SmsProvider & {
  // Every message "sent", in order, for tests to check
  sent: { phone: string; text: string }[];
};

// Used everywhere except staging and production: on your computer and in
// tests. Nothing leaves the computer and nothing is paid for; the message is
// printed in the terminal instead, so you can copy a login code from there.
export function createFakeSmsProvider(): FakeSmsProvider {
  const sent: FakeSmsProvider["sent"] = [];
  return {
    sent,
    async send(phone, text) {
      // Same number check as 019, so a bad number fails here too
      const destination = toSmsPhone(phone);
      sent.push({ phone: destination, text });
      console.log(`[sms] (fake, not sent) to ${destination}: ${text}`);
    },
  };
}
