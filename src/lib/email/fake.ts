import { toEmailAddress } from "./address";
import type { EmailMessage, EmailProvider } from "./email-provider";

export type FakeEmailProvider = EmailProvider & {
  // Every email "sent", in order, for tests to check
  sent: EmailMessage[];
};

// Used everywhere except staging and production: on your computer and in
// tests. Nothing leaves the computer; the email is printed in the terminal
// instead, so you can copy a code from there.
export function createFakeEmailProvider(): FakeEmailProvider {
  const sent: EmailMessage[] = [];
  return {
    sent,
    async send(message) {
      // Same address check as Resend, so a bad address fails here too
      const to = toEmailAddress(message.to);
      sent.push({ ...message, to });
      console.log(
        `[email] (fake, not sent) to ${to}: ${message.subject}\n${message.text}`,
      );
    },
  };
}
