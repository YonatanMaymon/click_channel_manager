import { describe, expect, it } from "vitest";

import { InvalidPhoneError } from "./errors";
import { toAccountPhone, toSmsPhone } from "./phone";

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

describe("toAccountPhone", () => {
  // One spelling per number, so "052-555-1234" and "+972 52 555 1234" log
  // into the same account instead of creating two
  it.each([
    ["052-555-1234", "+972525551234"],
    ["0525551234", "+972525551234"],
    ["+972 52 555 1234", "+972525551234"],
    [" 052 555 1234 ", "+972525551234"],
  ])("turns %j into %j", (input, expected) => {
    expect(toAccountPhone(input)).toBe(expected);
  });

  it.each([
    ["an empty number", ""],
    ["letters", "not a phone"],
    ["a landline", "03-123-4567"],
    ["a foreign mobile", "+1 202 555 0123"],
  ])("rejects %s", (_, input) => {
    expect(() => toAccountPhone(input)).toThrow(InvalidPhoneError);
  });
});
