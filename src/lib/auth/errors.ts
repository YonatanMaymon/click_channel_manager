import { APIError } from "better-auth/api";

// What a login screen needs to tell the owner when a code is refused
export type CodeError = "wrong_code" | "new_code_needed";

// Better Auth's reasons for refusing a code, turned into the two things the
// owner can do about it: try again, or ask for a new code.
export function codeError(error: unknown): CodeError | undefined {
  if (!(error instanceof APIError)) return undefined;
  switch (error.body?.code) {
    case "INVALID_OTP":
      return "wrong_code";
    case "OTP_EXPIRED":
    case "OTP_NOT_FOUND":
    case "TOO_MANY_ATTEMPTS":
      return "new_code_needed";
    default:
      return undefined;
  }
}

// Postgres refused a row because a unique rule (like one account per email)
// already has that value. The error may be wrapped, so look at its causes.
export function isUniqueViolation(error: unknown): boolean {
  for (let e = error; e; e = (e as { cause?: unknown }).cause) {
    if ((e as { code?: unknown }).code === "23505") return true;
  }
  return false;
}
