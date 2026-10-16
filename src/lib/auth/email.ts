// An owner's email: adding one to their account (verified with a code sent to
// it), and logging in with a code sent to it. Email never creates an account.
import { APIError } from "better-auth/api";

import { EmailSendError, InvalidEmailError, toEmailAddress } from "@/lib/email";

import type { Auth } from "./create-auth";
import { codeError, isUniqueViolation, type CodeError } from "./errors";

export type RequestEmailResult =
  | { ok: true }
  | {
      ok: false;
      error: "invalid_email" | "email_in_use" | "send_failed" | "not_logged_in";
    };

export type ConfirmEmailResult =
  | { ok: true }
  | {
      ok: false;
      error: "invalid_email" | "email_in_use" | "not_logged_in" | CodeError;
    };

export type SendEmailLoginResult =
  { ok: true } | { ok: false; error: "invalid_email" | "send_failed" };

export type VerifyEmailLoginResult =
  | { ok: true; headers: Headers }
  | { ok: false; error: "invalid_email" | CodeError };

function cleanAddress(email: string): string | undefined {
  try {
    return toEmailAddress(email);
  } catch {
    return undefined;
  }
}

function isNotLoggedIn(error: unknown) {
  return error instanceof APIError && error.statusCode === 401;
}

// Step 1 of adding an email: send a code to the new address. Nothing is
// saved yet. `headers` is the request's, carrying the login cookie.
export async function requestEmailCode(
  auth: Auth,
  headers: Headers,
  email: string,
): Promise<RequestEmailResult> {
  const newEmail = cleanAddress(email);
  if (!newEmail) return { ok: false, error: "invalid_email" };
  try {
    await auth.api.requestEmailChangeEmailOTP({ headers, body: { newEmail } });
    return { ok: true };
  } catch (error) {
    if (isNotLoggedIn(error)) return { ok: false, error: "not_logged_in" };
    if (error instanceof APIError && error.body?.code === "EMAIL_IN_USE") {
      return { ok: false, error: "email_in_use" };
    }
    // Already reported to Sentry by the email sender
    if (error instanceof EmailSendError)
      return { ok: false, error: "send_failed" };
    if (error instanceof InvalidEmailError) {
      return { ok: false, error: "invalid_email" };
    }
    throw error;
  }
}

// Step 2: the owner enters the code, and the address is saved as verified
export async function confirmEmailCode(
  auth: Auth,
  headers: Headers,
  email: string,
  code: string,
): Promise<ConfirmEmailResult> {
  const newEmail = cleanAddress(email);
  if (!newEmail) return { ok: false, error: "invalid_email" };
  try {
    await auth.api.changeEmailEmailOTP({
      headers,
      body: { newEmail, otp: code.trim() },
    });
    return { ok: true };
  } catch (error) {
    if (isNotLoggedIn(error)) return { ok: false, error: "not_logged_in" };
    const refused = codeError(error);
    if (refused) return { ok: false, error: refused };
    // Someone else saved this address after the code was sent. Usually
    // Better Auth's own check sees it ("Email already in use"); when both
    // save at the same moment, the unique rule on users.email refuses the
    // second one.
    if (
      isUniqueViolation(error) ||
      (error instanceof APIError &&
        error.body?.message === "Email already in use")
    ) {
      return { ok: false, error: "email_in_use" };
    }
    throw error;
  }
}

// Sends a login code if the address belongs to an account. The answer is the
// same either way, so nobody can use it to find out who has an account.
export async function sendEmailLoginCode(
  auth: Auth,
  email: string,
): Promise<SendEmailLoginResult> {
  const address = cleanAddress(email);
  if (!address) return { ok: false, error: "invalid_email" };
  try {
    await auth.api.sendVerificationOTP({
      body: { email: address, type: "sign-in" },
    });
    return { ok: true };
  } catch (error) {
    if (error instanceof EmailSendError)
      return { ok: false, error: "send_failed" };
    throw error;
  }
}

export async function verifyEmailLoginCode(
  auth: Auth,
  email: string,
  code: string,
): Promise<VerifyEmailLoginResult> {
  const address = cleanAddress(email);
  if (!address) return { ok: false, error: "invalid_email" };
  try {
    const { headers } = await auth.api.signInEmailOTP({
      body: { email: address, otp: code.trim() },
      returnHeaders: true,
    });
    return { ok: true, headers };
  } catch (error) {
    const refused = codeError(error);
    if (refused) return { ok: false, error: refused };
    throw error;
  }
}
