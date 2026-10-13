// The two ways sending an SMS can fail. Whoever calls send() catches them to
// show the right message on screen.

// The person typed a number we can't send to (too short, a landline, not
// Israeli). Their mistake to fix, so it is never reported to Sentry.
export class InvalidPhoneError extends Error {
  constructor(message = "Not an Israeli mobile number") {
    super(message);
    this.name = "InvalidPhoneError";
  }
}

// The message didn't go out for a reason on our side: 019 is down or didn't
// answer in time, the token expired, the credit ran out. Already reported to
// Sentry by the sender before it's thrown.
export class SmsSendError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "SmsSendError";
  }
}
