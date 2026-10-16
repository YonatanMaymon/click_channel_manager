// The two ways sending an email can fail. Whoever calls send() catches them
// to show the right message on screen.

// The person typed an address we can't send to. Their mistake to fix, so it
// is never reported to Sentry.
export class InvalidEmailError extends Error {
  constructor(message = "Not a valid email address") {
    super(message);
    this.name = "InvalidEmailError";
  }
}

// The email didn't go out for a reason on our side: Resend is down or didn't
// answer in time, the API key is wrong. Already reported to Sentry by the
// sender before it's thrown.
export class EmailSendError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "EmailSendError";
  }
}
