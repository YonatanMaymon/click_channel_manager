// Logging in (and signing up) with a phone number and a code sent by SMS.
// The login screen's server actions call these; each answers with what
// happened, so the screen can show the right message.
import { InvalidPhoneError, SmsSendError, toAccountPhone } from "@/lib/sms";

import type { Auth } from "./create-auth";
import { codeError, type CodeError } from "./errors";

export type SendCodeResult =
  { ok: true } | { ok: false; error: "invalid_phone" | "send_failed" };

export type VerifyCodeResult =
  // headers holds the login cookie. In a server action Better Auth also
  // sets it on the response by itself (nextCookies in ./create-auth.ts).
  | { ok: true; headers: Headers }
  | { ok: false; error: "invalid_phone" | CodeError };

export async function sendPhoneCode(
  auth: Auth,
  phone: string,
): Promise<SendCodeResult> {
  let phoneNumber: string;
  try {
    phoneNumber = toAccountPhone(phone);
  } catch {
    return { ok: false, error: "invalid_phone" };
  }
  try {
    await auth.api.sendPhoneNumberOTP({ body: { phoneNumber } });
    return { ok: true };
  } catch (error) {
    // Already reported to Sentry by the SMS sender
    if (error instanceof SmsSendError)
      return { ok: false, error: "send_failed" };
    if (error instanceof InvalidPhoneError) {
      return { ok: false, error: "invalid_phone" };
    }
    throw error;
  }
}

// A correct code logs in, or creates the account if the number is new
export async function verifyPhoneCode(
  auth: Auth,
  phone: string,
  code: string,
): Promise<VerifyCodeResult> {
  let phoneNumber: string;
  try {
    phoneNumber = toAccountPhone(phone);
  } catch {
    return { ok: false, error: "invalid_phone" };
  }
  try {
    const { headers } = await auth.api.verifyPhoneNumber({
      body: { phoneNumber, code: code.trim() },
      returnHeaders: true,
    });
    return { ok: true, headers };
  } catch (error) {
    const refused = codeError(error);
    if (refused) return { ok: false, error: refused };
    throw error;
  }
}
