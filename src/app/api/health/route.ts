// Railway calls this before switching traffic to a new deploy (see
// .railway/railway.ts). It answers 200 only if the app can reach the database,
// so a deploy that can't talk to Postgres never replaces a working one.
import { sql } from "drizzle-orm";
import { connection } from "next/server";

import { db } from "@/db";

export async function GET() {
  // Run on every request, never once at build time
  await connection();

  try {
    await db.execute(sql`select 1`);
    return Response.json({ ok: true });
  } catch (error) {
    console.error("[health] database check failed:", error);
    return Response.json({ ok: false }, { status: 503 });
  }
}
