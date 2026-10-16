// Shared by the auth tests: a Better Auth instance with fake senders, and
// small helpers to read codes and log in. Not used by the app.
import { sql } from "drizzle-orm";
import { vi } from "vitest";

import { db } from "@/db";
import { createFakeEmailProvider } from "@/lib/email";
import { createFakeSmsProvider, type SmsProvider } from "@/lib/sms";

import { createAuth } from "./create-auth";
import { verifyPhoneCode, sendPhoneCode } from "./login";

export function testAuth(options: { sms?: SmsProvider } = {}) {
  // The fakes print every message; keep the test output readable
  vi.spyOn(console, "log").mockImplementation(() => {});
  const sms = createFakeSmsProvider();
  const email = createFakeEmailProvider();
  const auth = createAuth({
    sms: options.sms ?? sms,
    email,
    secret: "test-secret-that-is-at-least-32-characters-long",
  });
  return { auth, sms, email };
}

export async function clearAuthTables() {
  await db.execute(
    sql`truncate table users, sessions, accounts, verifications, properties cascade`,
  );
}

// The 6-digit code in the last message, as the owner would read it
export function lastCode(sent: { text: string }[]): string {
  const text = sent.at(-1)?.text ?? "";
  const code = text.match(/\d{6}/)?.[0];
  if (!code) throw new Error(`No code in the last message: ${text}`);
  return code;
}

// Turns the Set-Cookie headers of a login into the Cookie header a browser
// would send back on its next request
export function cookieFrom(headers: Headers): Headers {
  const cookie = headers
    .getSetCookie()
    .map((setCookie) => setCookie.split(";")[0])
    .join("; ");
  return new Headers({ cookie });
}

export async function logInByPhone(
  { auth, sms }: ReturnType<typeof testAuth>,
  phone: string,
): Promise<Headers> {
  await sendPhoneCode(auth, phone);
  const result = await verifyPhoneCode(auth, phone, lastCode(sms.sent));
  if (!result.ok) throw new Error(`Login failed: ${result.error}`);
  return cookieFrom(result.headers);
}
