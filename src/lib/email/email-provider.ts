// What every email sender looks like to the rest of the app: login codes now,
// overlap alerts, confirmations and invoices later all just call send().
// Which sender is behind it (Resend, or the fake on your computer) is picked
// once, by createEmailProvider in ./index.ts.
export type EmailMessage = {
  to: string;
  subject: string;
  // Plain text only for now; enough for codes and short notices
  text: string;
};

export interface EmailProvider {
  // Resolves once Resend has accepted the email. Throws InvalidEmailError or
  // EmailSendError (./errors.ts).
  send(message: EmailMessage): Promise<void>;
}

// Same as the SMS one: how a sender reports a failure on our side
export type { ReportError } from "@/lib/sms";
