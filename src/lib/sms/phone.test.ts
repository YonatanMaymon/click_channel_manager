import { describe, expect, it } from "vitest";

import { InvalidPhoneError } from "./errors";
import { toSmsPhone } from "./phone";

describe("toSmsPhone", () => {
  // 019 wants Israeli mobiles as 05xxxxxxxx: digits only, leading 0
  it.each([
    ["052-555-1234", "0525551234"],
    ["0525551234", "0525551234"],
    ["+972 52 555 1234", "0525551234"],
    ["+972-52-555-1234", "0525551234"],
    [" 052 555 1234 ", "0525551234"],
  ])("turns %j into %j", (input, expected) => {
    expect(toSmsPhone(input)).toBe(expected);
  });

  it.each([
    ["an empty number", ""],
    ["a number that's too short", "12345"],
    ["letters", "not a phone"],
    // A landline can't receive an SMS, and 019 would still charge for it
    ["a landline", "03-123-4567"],
    // Only Israeli numbers in the MVP
    ["a foreign mobile", "+1 202 555 0123"],
  ])("rejects %s", (_, input) => {
    expect(() => toSmsPhone(input)).toThrow(InvalidPhoneError);
  });
});
