// Sends email through Resend (resend.com). API docs:
// https://resend.com/docs/api-reference/emails/send-email
import { toEmailAddress } from "./address";
import { EmailSendError } from "./errors";
import type { EmailProvider, ReportError } from "./email-provider";

export type ResendSettings = {
  // Secret, from Resend's dashboard
  apiKey: string;
  // Who the email is from. Until we have our own domain this is Resend's
  // test sender, onboarding@resend.dev, which only delivers to the address
  // the Resend account was opened with.
  from: string;
};

// Long enough for a slow answer, short enough that the owner waiting on the
// screen sees an error instead of a spinner that never stops
const TIMEOUT_MS = 10_000;

export function createResendProvider(
  settings: ResendSettings,
  report: ReportError,
): EmailProvider {
  // Our-side failures are reported here, once, so no caller can forget to
  const fail = (message: string, cause?: unknown): never => {
    const error = new EmailSendError(`Resend: ${message}`, { cause });
    report(error);
    throw error;
  };

  return {
    async send(message) {
      // Throws InvalidEmailError before anything is sent
      const to = toEmailAddress(message.to);

      // fetch on its own waits forever for a server that never answers.
      // Aborting cancels the request after TIMEOUT_MS.
      const abort = new AbortController();
      const timer = setTimeout(() => abort.abort(), TIMEOUT_MS);

      try {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${settings.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: settings.from,
            to: [to],
            subject: message.subject,
            text: message.text,
          }),
          signal: abort.signal,
        });
        if (!response.ok) {
          // Resend's own message says what went wrong; it never contains the key
          const body = (await response.json().catch(() => ({}))) as {
            message?: unknown;
          };
          fail(`HTTP ${response.status} (${String(body.message)})`);
        }
      } catch (error) {
        if (error instanceof EmailSendError) throw error;
        fail(
          abort.signal.aborted
            ? `no answer within ${TIMEOUT_MS / 1000} seconds`
            : "request failed",
          error,
        );
      } finally {
        clearTimeout(timer);
      }
    },
  };
}
