// Better Auth's settings for this copy of the app, checked the same way as
// the SMS and email settings: in staging and production a missing setting
// stops the app from starting.
export type AuthConfig = {
  // Signs every login cookie, so nobody can forge one. Anyone who has it can
  // log in as any owner: keep it secret, and never reuse the one below.
  secret: string;
  // The app's public address, such as https://click-staging.up.railway.app.
  // Requests that come from anywhere else are refused. Left empty on your
  // computer, where Better Auth reads it from each request.
  baseURL?: string;
};

// Only for your computer and tests. It's in the repository, so it protects
// nothing; staging and production must set their own.
const DEVELOPMENT_SECRET =
  "development-only-secret-not-for-real-use-0123456789";

const SETTINGS = ["BETTER_AUTH_SECRET", "BETTER_AUTH_URL"] as const;

// Better Auth's own minimum; a short secret is easy to guess
const MIN_SECRET_LENGTH = 32;

export function authConfig(
  env: Record<string, string | undefined>,
  environment: string,
): AuthConfig {
  if (environment !== "staging" && environment !== "production") {
    return { secret: DEVELOPMENT_SECRET };
  }
  // Names only, never values: this message goes to the deploy logs
  const missing = SETTINGS.filter((name) => !env[name]);
  if (missing.length > 0) {
    throw new Error(
      `Login settings missing in ${environment}: ${missing.join(", ")}`,
    );
  }
  if (env.BETTER_AUTH_SECRET!.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `BETTER_AUTH_SECRET in ${environment} must be at least ${MIN_SECRET_LENGTH} characters`,
    );
  }
  return {
    secret: env.BETTER_AUTH_SECRET!,
    baseURL: env.BETTER_AUTH_URL!,
  };
}
