// Which copy of the app this is: "staging" or "production" on Railway,
// "development" anywhere else (your computer, tests). Decides how errors are
// labelled in Sentry and whether SMS messages really go out (src/lib/sms).
//
// The variable is NEXT_PUBLIC_ so Next.js copies it into the browser code at
// build time; it's named for Sentry because Sentry was its first user. On
// Railway it's set in .railway/railway.ts.
//
// If it's missing from a production build, assume production: the test error
// triggers stay closed there and the real SMS settings are required, so a
// missing variable must never open the first or skip the second.
export const appEnvironment =
  process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ??
  (process.env.NODE_ENV === "production" ? "production" : "development");
