// How owners log in, set up with Better Auth (https://better-auth.com):
//
// - Sign up and log in with an Israeli mobile number and a code sent by SMS.
//   A correct code for a new number creates the account.
// - Optionally add an email after signup, saved only once a code sent to it
//   is entered. Then the owner can also log in with a code sent by email.
//   Email never creates an account.
// - Codes last 5 minutes and are cancelled after 5 wrong guesses.
// - A login lasts 30 days, counted from the last time the app was used.
//
// The app uses the instance in ./index.ts; tests build their own with fake
// senders.
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { emailOTP } from "better-auth/plugins/email-otp";
import { phoneNumber } from "better-auth/plugins/phone-number";

import { db } from "@/db";
import { accounts, sessions, users, verifications } from "@/db/schema";
import type { EmailProvider } from "@/lib/email";
import { toAccountPhone, type SmsProvider } from "@/lib/sms";

import type { AuthConfig } from "./config";

const MINUTE = 60;
const DAY = 24 * 60 * MINUTE;

const CODE_LENGTH = 6;
const CODE_LIFETIME = 5 * MINUTE;
const WRONG_GUESSES_ALLOWED = 5;

// Better Auth needs an email on every user, unique. Until a phone-only owner
// verifies a real one, they get this placeholder. ".invalid" is reserved for
// addresses that can never exist, so nothing can ever be delivered to it.
const PLACEHOLDER_DOMAIN = "@phone.invalid";

// Better Auth endpoints we don't use. Turned off so nobody can call them
// directly: password logins and resets (we have no passwords), Better Auth's
// own email change (ours goes through a code, below), and editing the user
// (the only editable fields would be name and picture, which we don't use).
const UNUSED_PATHS = [
  "/sign-in/phone-number",
  "/phone-number/request-password-reset",
  "/phone-number/reset-password",
  "/email-otp/request-password-reset",
  "/email-otp/reset-password",
  "/forget-password/email-otp",
  "/email-otp/verify-email",
  "/email-otp/check-verification-otp",
  "/change-email",
  "/update-user",
];

export function createAuth(
  deps: {
    sms: SmsProvider;
    email: EmailProvider;
  } & AuthConfig,
) {
  return betterAuth({
    secret: deps.secret,
    baseURL: deps.baseURL,
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: { users, sessions, accounts, verifications },
      usePlural: true,
    }),
    session: {
      expiresIn: 30 * DAY,
      // At most once a day, using the app moves the end 30 days forward
      updateAge: 1 * DAY,
    },
    user: {
      additionalFields: {
        // Set by the server when onboarding creates the property (input:
        // false, so a request can't set it); see src/db/schema/auth.ts
        propertyId: { type: "string", required: false, input: false },
      },
    },
    disabledPaths: UNUSED_PATHS,
    hooks: {
      // The owner asked for "already in use" when adding someone else's
      // email. Better Auth's own answer is a silent success that sends
      // nothing. This check gives the clear message; the unique rule on
      // users.email is what really guarantees one account per address.
      before: createAuthMiddleware(async (ctx) => {
        if (ctx.path !== "/email-otp/request-email-change") return;
        const newEmail = String(ctx.body?.newEmail ?? "").toLowerCase();
        if (await ctx.context.internalAdapter.findUserByEmail(newEmail)) {
          throw new APIError("BAD_REQUEST", {
            code: "EMAIL_IN_USE",
            message: "Email already in use",
          });
        }
      }),
    },
    plugins: [
      phoneNumber({
        otpLength: CODE_LENGTH,
        expiresIn: CODE_LIFETIME,
        allowedAttempts: WRONG_GUESSES_ALLOWED,
        // Only the +972 spelling is accepted, so one phone can never become
        // two accounts. Our screens convert what the owner typed first.
        phoneNumberValidator: (phone) => {
          try {
            return toAccountPhone(phone) === phone;
          } catch {
            return false;
          }
        },
        sendOTP: async ({ phoneNumber, code }) => {
          await deps.sms.send(
            phoneNumber,
            `קוד הכניסה שלך: ${code}\nהקוד בתוקף ל-5 דקות.`,
          );
        },
        // A correct code for a new number creates the account
        signUpOnVerification: {
          getTempEmail: (phone) =>
            `${phone.replace("+", "")}${PLACEHOLDER_DOMAIN}`,
          getTempName: (phone) => phone,
        },
      }),
      emailOTP({
        otpLength: CODE_LENGTH,
        expiresIn: CODE_LIFETIME,
        allowedAttempts: WRONG_GUESSES_ALLOWED,
        // Email logs into existing accounts only
        disableSignUp: true,
        // Saved scrambled, so codes can't be read from a leaked database
        storeOTP: "hashed",
        // Add an email: a code goes to the new address, and the address is
        // saved only once the code is entered
        changeEmail: { enabled: true },
        sendVerificationOTP: async ({ email, otp, type }) => {
          if (email.endsWith(PLACEHOLDER_DOMAIN)) return;
          const isLogin = type === "sign-in";
          await deps.email.send({
            to: email,
            subject: isLogin ? "קוד כניסה" : "אימות כתובת המייל",
            text: isLogin
              ? `קוד הכניסה שלך: ${otp}\nהקוד בתוקף ל-5 דקות.`
              : `קוד האימות שלך: ${otp}\nהקוד בתוקף ל-5 דקות.\nאם לא ביקשת להוסיף את הכתובת הזו, אפשר להתעלם מהמייל.`,
          });
        },
      }),
      // Lets server actions set the login cookie. Must stay last.
      nextCookies(),
    ],
  });
}

export type Auth = ReturnType<typeof createAuth>;
