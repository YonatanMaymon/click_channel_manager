// Sends SMS through 019 (019sms.co.il). API docs: https://docs.019sms.co.il/sms/
import { InvalidPhoneError, SmsSendError } from "./errors";
import { toSmsPhone } from "./phone";
import type { ReportError, SmsProvider } from "./sms-provider";

export type Sms019Settings = {
  username: string;
  // API token from 019's site. It expires on a fixed date and can't be
  // renewed: make a new one before then, or every send fails with status 10.
  token: string;
  // Who the message is from: up to 11 English letters or digits, approved by 019
  source: string;
  // Use 019's test address, which checks the request but sends nothing
  dryRun?: boolean;
};

// Long enough for a slow answer, short enough that the person waiting on the
// login screen sees an error instead of a spinner that never stops
const TIMEOUT_MS = 10_000;

// 019's status codes (https://docs.019sms.co.il/sms/errors-and-status.html)
const ACCEPTED = 0;
const BAD_DESTINATION = 9; // "destination too short or too long"

export function create019Provider(
  settings: Sms019Settings,
  report: ReportError,
): SmsProvider {
  const url = settings.dryRun
    ? "https://019sms.co.il/api/test"
    : "https://019sms.co.il/api";

  // Our-side failures are reported here, once, so no caller can forget to
  const fail = (message: string, cause?: unknown): never => {
    const error = new SmsSendError(`019: ${message}`, { cause });
    report(error);
    throw error;
  };

  return {
    async send(phone, text) {
      // Throws InvalidPhoneError before anything is sent or paid for
      const destination = toSmsPhone(phone);

      // fetch on its own waits forever for a server that never answers.
      // Aborting cancels the request after TIMEOUT_MS.
      const abort = new AbortController();
      const timer = setTimeout(() => abort.abort(), TIMEOUT_MS);

      let response: Response;
      let body: { status?: unknown; message?: unknown };
      try {
        response = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${settings.token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sms: {
              user: { username: settings.username },
              source: settings.source,
              destinations: { phone: [{ _: destination }] },
              message: text,
            },
          }),
          signal: abort.signal,
        });
        if (!response.ok) {
          return fail(`HTTP ${response.status}`);
        }
        body = await response.json();
      } catch (error) {
        if (error instanceof SmsSendError) throw error;
        return fail(
          abort.signal.aborted
            ? `no answer within ${TIMEOUT_MS / 1000} seconds`
            : "request failed",
          error,
        );
      } finally {
        clearTimeout(timer);
      }

      // 019 may send the status as a number or as text
      const status = Number(body.status);
      if (status === ACCEPTED) return;
      if (status === BAD_DESTINATION) throw new InvalidPhoneError();
      // 019's own message says what went wrong ("Expired API token"); it never
      // contains the token
      fail(`status ${String(body.status)} (${String(body.message)})`);
    },
  };
}
