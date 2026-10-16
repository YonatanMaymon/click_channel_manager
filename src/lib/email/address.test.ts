import { describe, expect, it } from "vitest";

import { toEmailAddress } from "./address";
import { InvalidEmailError } from "./errors";

describe("toEmailAddress", () => {
  // One spelling per address, so "Dana@Gmail.com" and "dana@gmail.com" are
  // the same owner, and "already in use" catches both
  it.each([
    ["dana@gmail.com", "dana@gmail.com"],
    ["Dana@Gmail.COM", "dana@gmail.com"],
    ["  dana@gmail.com ", "dana@gmail.com"],
  ])("turns %j into %j", (input, expected) => {
    expect(toEmailAddress(input)).toBe(expected);
  });

  it.each([
    ["an empty address", ""],
    ["an address without a domain", "dana@"],
    ["an address without @", "dana.gmail.com"],
    ["two addresses", "a@gmail.com, b@gmail.com"],
    // The placeholder phone-only accounts get: nothing can be delivered there
    ["a .invalid address", "972525551234@phone.invalid"],
  ])("rejects %s", (_, input) => {
    expect(() => toEmailAddress(input)).toThrow(InvalidEmailError);
  });
});
