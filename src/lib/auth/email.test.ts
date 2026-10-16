import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "@/db";
import { users } from "@/db/schema";

import {
  confirmEmailCode,
  requestEmailCode,
  sendEmailLoginCode,
  verifyEmailLoginCode,
} from "./email";
import {
  clearAuthTables,
  cookieFrom,
  lastCode,
  logInByPhone,
  testAuth,
} from "./test-support";

type T = ReturnType<typeof testAuth>;

async function currentUser(t: T, cookie: Headers) {
  const session = await t.auth.api.getSession({ headers: cookie });
  return session!.user;
}

// Logs in by phone, then adds and verifies an email, as an owner would
async function ownerWithEmail(t: T, phone: string, email: string) {
  const cookie = await logInByPhone(t, phone);
  await requestEmailCode(t.auth, cookie, email);
  const result = await confirmEmailCode(
    t.auth,
    cookie,
    email,
    lastCode(t.email.sent),
  );
  if (!result.ok) throw new Error(`Adding email failed: ${result.error}`);
  return cookie;
}

function wrongCodeFor(code: string) {
  return code === "000000" ? "111111" : "000000";
}

beforeEach(async () => {
  await clearAuthTables();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("adding an email to an account", () => {
  it("sends a code to the new address, without saving it yet", async () => {
    const t = testAuth();
    const cookie = await logInByPhone(t, "052-555-1234");
    const before = await currentUser(t, cookie);

    const result = await requestEmailCode(t.auth, cookie, "dana@gmail.com");

    expect(result).toEqual({ ok: true });
    expect(t.email.sent).toHaveLength(1);
    expect(t.email.sent[0].to).toBe("dana@gmail.com");
    expect(t.email.sent[0].text).toMatch(/\d{6}/);
    // Not saved until the owner proves the address is theirs
    const after = await currentUser(t, cookie);
    expect(after.email).toBe(before.email);
    expect(after.emailVerified).toBe(false);
  });

  it("saves the email once the owner enters the right code", async () => {
    const t = testAuth();
    const cookie = await logInByPhone(t, "052-555-1234");
    await requestEmailCode(t.auth, cookie, "dana@gmail.com");

    const result = await confirmEmailCode(
      t.auth,
      cookie,
      "dana@gmail.com",
      lastCode(t.email.sent),
    );

    expect(result).toEqual({ ok: true });
    const user = await currentUser(t, cookie);
    expect(user.email).toBe("dana@gmail.com");
    expect(user.emailVerified).toBe(true);
  });

  it("saves the address in one spelling, however it was typed", async () => {
    const t = testAuth();
    const cookie = await ownerWithEmail(t, "052-555-1234", "  Dana@Gmail.COM ");

    expect((await currentUser(t, cookie)).email).toBe("dana@gmail.com");
  });

  it("refuses a wrong code and keeps the old email", async () => {
    const t = testAuth();
    const cookie = await logInByPhone(t, "052-555-1234");
    const before = await currentUser(t, cookie);
    await requestEmailCode(t.auth, cookie, "dana@gmail.com");

    const result = await confirmEmailCode(
      t.auth,
      cookie,
      "dana@gmail.com",
      wrongCodeFor(lastCode(t.email.sent)),
    );

    expect(result).toEqual({ ok: false, error: "wrong_code" });
    expect((await currentUser(t, cookie)).email).toBe(before.email);
  });

  it("refuses an address that isn't valid, without sending", async () => {
    const t = testAuth();
    const cookie = await logInByPhone(t, "052-555-1234");

    const result = await requestEmailCode(t.auth, cookie, "dana@");

    expect(result).toEqual({ ok: false, error: "invalid_email" });
    expect(t.email.sent).toEqual([]);
  });

  it("needs a logged-in owner", async () => {
    const t = testAuth();

    const result = await requestEmailCode(
      t.auth,
      new Headers(),
      "dana@gmail.com",
    );

    expect(result).toEqual({ ok: false, error: "not_logged_in" });
    expect(t.email.sent).toEqual([]);
  });
});

describe("one email per account", () => {
  it("tells a second owner the email is already in use, and sends nothing", async () => {
    const t = testAuth();
    await ownerWithEmail(t, "052-555-1234", "dana@gmail.com");
    const sentBefore = t.email.sent.length;
    const other = await logInByPhone(t, "052-555-9999");

    const result = await requestEmailCode(t.auth, other, "Dana@gmail.com");

    expect(result).toEqual({ ok: false, error: "email_in_use" });
    expect(t.email.sent).toHaveLength(sentBefore);
  });

  // Both pass the "in use?" check before either is saved. The database's
  // unique rule on the email column must stop the second one.
  it("lets only one of two owners verifying the same email at once keep it", async () => {
    const t = testAuth();
    const a = await logInByPhone(t, "052-555-1234");
    const b = await logInByPhone(t, "052-555-9999");
    await requestEmailCode(t.auth, a, "dana@gmail.com");
    const codeA = lastCode(t.email.sent);
    await requestEmailCode(t.auth, b, "dana@gmail.com");
    const codeB = lastCode(t.email.sent);

    const results = await Promise.all([
      confirmEmailCode(t.auth, a, "dana@gmail.com", codeA),
      confirmEmailCode(t.auth, b, "dana@gmail.com", codeB),
    ]);

    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.filter((r) => !r.ok)).toEqual([
      { ok: false, error: "email_in_use" },
    ]);
    const owners = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, "dana@gmail.com"));
    expect(owners).toHaveLength(1);
  });
});

describe("logging in by email", () => {
  it("logs into the owner's existing account with a code sent by email", async () => {
    const t = testAuth();
    const phoneCookie = await ownerWithEmail(
      t,
      "052-555-1234",
      "dana@gmail.com",
    );
    const owner = await currentUser(t, phoneCookie);

    expect(await sendEmailLoginCode(t.auth, "Dana@gmail.com")).toEqual({
      ok: true,
    });
    expect(t.email.sent.at(-1)?.to).toBe("dana@gmail.com");
    const result = await verifyEmailLoginCode(
      t.auth,
      "dana@gmail.com",
      lastCode(t.email.sent),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const user = await currentUser(t, cookieFrom(result.headers));
    expect(user.id).toBe(owner.id);
  });

  // Email is never a way to sign up: accounts start with a phone number
  it("never creates an account for an unknown email", async () => {
    const t = testAuth();

    // Same answer as for a known address, so it can't be used to test
    // which addresses have accounts
    expect(await sendEmailLoginCode(t.auth, "stranger@gmail.com")).toEqual({
      ok: true,
    });
    expect(t.email.sent).toEqual([]);
    const result = await verifyEmailLoginCode(
      t.auth,
      "stranger@gmail.com",
      "123456",
    );

    expect(result.ok).toBe(false);
    expect(await db.select().from(users)).toEqual([]);
  });

  // Phone-only accounts hold a placeholder address until the owner adds one
  it("never sends to the placeholder address of a phone-only account", async () => {
    const t = testAuth();
    const cookie = await logInByPhone(t, "052-555-1234");
    const placeholder = (await currentUser(t, cookie)).email;

    await sendEmailLoginCode(t.auth, placeholder);
    await t.auth.api
      .sendVerificationOTP({ body: { email: placeholder, type: "sign-in" } })
      .catch(() => {});

    expect(t.email.sent).toEqual([]);
  });

  it("refuses an address that isn't valid", async () => {
    const t = testAuth();

    expect(await sendEmailLoginCode(t.auth, "dana@")).toEqual({
      ok: false,
      error: "invalid_email",
    });
  });

  it("cancels the code after 5 wrong guesses", async () => {
    const t = testAuth();
    await ownerWithEmail(t, "052-555-1234", "dana@gmail.com");
    await sendEmailLoginCode(t.auth, "dana@gmail.com");
    const code = lastCode(t.email.sent);

    for (let i = 0; i < 5; i++) {
      expect(
        await verifyEmailLoginCode(
          t.auth,
          "dana@gmail.com",
          wrongCodeFor(code),
        ),
      ).toEqual({ ok: false, error: "wrong_code" });
    }

    expect(await verifyEmailLoginCode(t.auth, "dana@gmail.com", code)).toEqual({
      ok: false,
      error: "new_code_needed",
    });
  });

  it("refuses the code after 5 minutes", async () => {
    const t = testAuth();
    await ownerWithEmail(t, "052-555-1234", "dana@gmail.com");
    vi.useFakeTimers({ toFake: ["Date"] });
    await sendEmailLoginCode(t.auth, "dana@gmail.com");

    vi.setSystemTime(Date.now() + 5 * 60 * 1000 + 1000);

    expect(
      await verifyEmailLoginCode(
        t.auth,
        "dana@gmail.com",
        lastCode(t.email.sent),
      ),
    ).toEqual({ ok: false, error: "new_code_needed" });
  });
});
