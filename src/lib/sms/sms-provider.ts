// What every SMS sender looks like to the rest of the app: login codes,
// booking confirmations and overlap alerts all just call send(). Which
// sender is behind it (019, or the fake on your computer) is picked once, by
// createSmsProvider in ./index.ts.
export interface SmsProvider {
  // Resolves once the gateway has accepted the message. Throws
  // InvalidPhoneError or SmsSendError (./errors.ts).
  send(phone: string, text: string): Promise<void>;
}

// How a sender reports a failure on our side; Sentry.captureException in the
// app. Passed in rather than imported, because the web app and the worker
// each use their own Sentry package (and tests use neither).
export type ReportError = (error: unknown) => void;
