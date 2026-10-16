import { sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "@/db";
import { properties, users } from "@/db/schema";
import { SmsSendError, type SmsProvider } from "@/lib/sms";

import { sendPhoneCode, verifyPhoneCode } from "./login";
import {
  clearAuthTables,
  cookieFrom,
  lastCode,
  logInByPhone,
  testAuth,
} from "./test-support";

const DAY = 24 * 60 * 60 * 1000;

async function userCount() {
  const rows = await db.select({ id: users.id }).from(users);
  return rows.length;
}

beforeEach(async () => {
  await clearAuthTables();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("sending a login code by SMS", () => {
  it("sends a 6-digit code to the phone", async () => {
    const t = testAuth();

    const result = await sendPhoneCode(t.auth, "052-555-1234");

    expect(result).toEqual({ ok: true });
    expect(t.sms.sent).toHaveLength(1);
    expect(t.sms.sent[0].phone).toBe("0525551234");
    expect(t.sms.sent[0].text).toMatch(/\d{6}/);
  });

  it.each([
    ["a foreign mobile", "+1 202 555 0123"],
    ["a landline", "03-123-4567"],
    ["something that isn't a number", "abc"],
  ])("refuses %s without sending anything", async (_, phone) => {
    const t = testAuth();

    const result = await sendPhoneCode(t.auth, phone);

    expect(result).toEqual({ ok: false, error: "invalid_phone" });
    expect(t.sms.sent).toEqual([]);
  });

  it("says so when the SMS gateway fails", async () => {
    const broken: SmsProvider = {
      send: async () => {
        throw new SmsSendError("019: status 10");
      },
    };
    const t = testAuth({ sms: broken });

    const result = await sendPhoneCode(t.auth, "052-555-1234");

    expect(result).toEqual({ ok: false, error: "send_failed" });
  });

  // Our screens clean the number up first, but someone can call the login
  // address directly. Only one spelling is allowed, or "0525551234" and
  // "+972525551234" could become two accounts for one phone.
  it("refuses a number in any form but +972 when called directly", async () => {
    const t = testAuth();

    await expect(
      t.auth.api.sendPhoneNumberOTP({ body: { phoneNumber: "0525551234" } }),
    ).rejects.toThrow();
    expect(t.sms.sent).toEqual([]);
  });
});

describe("signing up and logging in with the code", () => {
  it("creates an account for a new phone, with no property yet, and logs in", async () => {
    const t = testAuth();
    await sendPhoneCode(t.auth, "052-555-1234");

    const result = await verifyPhoneCode(
      t.auth,
      "052-555-1234",
      lastCode(t.sms.sent),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const session = await t.auth.api.getSession({
      headers: cookieFrom(result.headers),
    });
    expect(session?.user.phoneNumber).toBe("+972525551234");
    // Null until onboarding step 2 creates the property
    expect(session?.user.propertyId).toBeNull();
    // Email is set up later, after signup
    expect(session?.user.emailVerified).toBe(false);
    expect(await userCount()).toBe(1);
  });

  it("logs back into the same account, however the number is written", async () => {
    const t = testAuth();
    const first = await logInByPhone(t, "052-555-1234");
    const second = await logInByPhone(t, "+972 52 555 1234");

    const a = await t.auth.api.getSession({ headers: first });
    const b = await t.auth.api.getSession({ headers: second });

    expect(b?.user.id).toBe(a?.user.id);
    expect(await userCount()).toBe(1);
  });

  it("refuses a wrong code and creates nothing", async () => {
    const t = testAuth();
    await sendPhoneCode(t.auth, "052-555-1234");
    const wrong = lastCode(t.sms.sent) === "000000" ? "111111" : "000000";

    const result = await verifyPhoneCode(t.auth, "052-555-1234", wrong);

    expect(result).toEqual({ ok: false, error: "wrong_code" });
    expect(await userCount()).toBe(0);
  });

  it("refuses a code sent to a different phone", async () => {
    const t = testAuth();
    await sendPhoneCode(t.auth, "052-555-1234");

    const result = await verifyPhoneCode(
      t.auth,
      "052-555-9999",
      lastCode(t.sms.sent),
    );

    expect(result.ok).toBe(false);
    expect(await userCount()).toBe(0);
  });

  it("still accepts the right code after 4 wrong ones", async () => {
    const t = testAuth();
    await sendPhoneCode(t.auth, "052-555-1234");
    const code = lastCode(t.sms.sent);
    const wrong = code === "000000" ? "111111" : "000000";

    for (let i = 0; i < 4; i++) {
      await verifyPhoneCode(t.auth, "052-555-1234", wrong);
    }

    expect((await verifyPhoneCode(t.auth, "052-555-1234", code)).ok).toBe(true);
  });

  // After 5 wrong guesses the code is cancelled, even the right one fails:
  // otherwise someone could keep guessing until they hit it
  it("cancels the code after 5 wrong guesses", async () => {
    const t = testAuth();
    await sendPhoneCode(t.auth, "052-555-1234");
    const code = lastCode(t.sms.sent);
    const wrong = code === "000000" ? "111111" : "000000";

    for (let i = 0; i < 5; i++) {
      expect(await verifyPhoneCode(t.auth, "052-555-1234", wrong)).toEqual({
        ok: false,
        error: "wrong_code",
      });
    }

    expect(await verifyPhoneCode(t.auth, "052-555-1234", code)).toEqual({
      ok: false,
      error: "new_code_needed",
    });
    expect(await userCount()).toBe(0);
  });

  it("works again with a new code after the old one was cancelled", async () => {
    const t = testAuth();
    await sendPhoneCode(t.auth, "052-555-1234");
    const wrong = lastCode(t.sms.sent) === "000000" ? "111111" : "000000";
    for (let i = 0; i < 6; i++) {
      await verifyPhoneCode(t.auth, "052-555-1234", wrong);
    }

    await sendPhoneCode(t.auth, "052-555-1234");
    const result = await verifyPhoneCode(
      t.auth,
      "052-555-1234",
      lastCode(t.sms.sent),
    );

    expect(result.ok).toBe(true);
  });

  it("accepts the code just before 5 minutes", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const t = testAuth();
    await sendPhoneCode(t.auth, "052-555-1234");

    vi.setSystemTime(Date.now() + 4 * 60 * 1000 + 50 * 1000);

    expect(
      (await verifyPhoneCode(t.auth, "052-555-1234", lastCode(t.sms.sent))).ok,
    ).toBe(true);
  });

  it("refuses the code after 5 minutes", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const t = testAuth();
    await sendPhoneCode(t.auth, "052-555-1234");

    vi.setSystemTime(Date.now() + 5 * 60 * 1000 + 1000);

    expect(
      await verifyPhoneCode(t.auth, "052-555-1234", lastCode(t.sms.sent)),
    ).toEqual({ ok: false, error: "new_code_needed" });
    expect(await userCount()).toBe(0);
  });

  // A double tap sends the same code twice at the same moment
  it("uses a code only once, even when it arrives twice at once", async () => {
    const t = testAuth();
    await sendPhoneCode(t.auth, "052-555-1234");
    const code = lastCode(t.sms.sent);

    const results = await Promise.all([
      verifyPhoneCode(t.auth, "052-555-1234", code),
      verifyPhoneCode(t.auth, "052-555-1234", code),
    ]);

    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(await userCount()).toBe(1);
  });
});

describe("sessions", () => {
  it("lasts 30 days", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const t = testAuth();
    const cookie = await logInByPhone(t, "052-555-1234");

    const session = await t.auth.api.getSession({ headers: cookie });

    const daysLeft = (session!.session.expiresAt.getTime() - Date.now()) / DAY;
    expect(daysLeft).toBeCloseTo(30, 1);
  });

  // An owner who opens the app every few days is never logged out
  it("moves the expiry forward when the app is used", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const t = testAuth();
    const cookie = await logInByPhone(t, "052-555-1234");

    vi.setSystemTime(Date.now() + 20 * DAY);
    await t.auth.api.getSession({ headers: cookie });
    vi.setSystemTime(Date.now() + 20 * DAY);

    // 40 days after login, but only 20 since it was last used
    const session = await t.auth.api.getSession({ headers: cookie });
    expect(session).not.toBeNull();
  });

  it("logs out a phone that hasn't opened the app for 30 days", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const t = testAuth();
    const cookie = await logInByPhone(t, "052-555-1234");

    vi.setSystemTime(Date.now() + 30 * DAY + 60 * 1000);

    expect(await t.auth.api.getSession({ headers: cookie })).toBeNull();
  });

  it("ends the session on log out", async () => {
    const t = testAuth();
    const cookie = await logInByPhone(t, "052-555-1234");

    await t.auth.api.signOut({ headers: cookie });

    expect(await t.auth.api.getSession({ headers: cookie })).toBeNull();
  });
});

describe("the owner's property link", () => {
  // Which property an owner manages decides which data they see. Only the
  // server may set it (onboarding step 2), never the owner's own request.
  it("can't be set by the owner through Better Auth", async () => {
    const t = testAuth();
    const cookie = await logInByPhone(t, "052-555-1234");
    const [property] = await db
      .insert(properties)
      .values({ name: "x", address: "x", phone: "+972525551234" })
      .returning();

    await t.auth.api
      .updateUser({
        headers: cookie,
        body: { propertyId: property.id } as never,
      })
      .catch(() => {});

    const session = await t.auth.api.getSession({ headers: cookie });
    expect(session?.user.propertyId).toBeNull();
  });

  it("must point to a property that exists", async () => {
    const t = testAuth();
    const cookie = await logInByPhone(t, "052-555-1234");
    const session = await t.auth.api.getSession({ headers: cookie });

    await expect(
      db.execute(
        sql`update users set property_id = gen_random_uuid() where id = ${session!.user.id}`,
      ),
    ).rejects.toThrow();
  });
});
