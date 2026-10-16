import * as z from "zod";

import { InvalidEmailError } from "./errors";

const emailSchema = z.email();

// Turns what someone typed into the one spelling we store and send to:
// no spaces around it, all lower case. Throws InvalidEmailError for anything
// that isn't a single, deliverable address.
export function toEmailAddress(input: string): string {
  const address = input.trim().toLowerCase();
  // ".invalid" is reserved and can never receive mail. Phone-only accounts
  // hold such a placeholder (src/lib/auth), and nothing may be sent to it.
  if (!emailSchema.safeParse(address).success || address.endsWith(".invalid")) {
    throw new InvalidEmailError();
  }
  return address;
}
