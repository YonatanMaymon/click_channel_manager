// Throws on purpose, to check that server errors reach Sentry. Called from the
// /sentry-test page. In production it answers 404 so nobody can use it to fill
// up the Sentry quota.
import { connection } from "next/server";

import { sentryEnvironment } from "@/lib/sentry-options";

export async function GET() {
  // Run on every request, never once at build time
  await connection();

  if (sentryEnvironment === "production") {
    return new Response(null, { status: 404 });
  }
  throw new Error("Sentry test error from the web server");
}
