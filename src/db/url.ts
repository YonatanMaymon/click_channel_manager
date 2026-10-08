// The one place DATABASE_URL is read and checked, shared by the web app, the
// worker and drizzle-kit. Kept apart from ./index.ts so that reading the URL
// doesn't also create a connection pool.
export function databaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env.");
  }
  return url;
}
