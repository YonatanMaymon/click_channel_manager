// "max" includes the data that tells a mobile number from a landline
import {
  type PhoneNumber,
  parsePhoneNumberFromString,
} from "libphonenumber-js/max";

import { InvalidPhoneError } from "./errors";

// Reads any way of writing an Israeli mobile number ("052-555-1234",
// "+972 52 555 1234"). Throws InvalidPhoneError for anything that can't
// receive an SMS, before we pay for a message that would never arrive.
function parseIsraeliMobile(input: string): PhoneNumber {
  // Numbers without a country code are read as Israeli
  const phone = parsePhoneNumberFromString(input, "IL");
  if (
    !phone ||
    phone.country !== "IL" ||
    !phone.isValid() ||
    phone.getType() !== "MOBILE"
  ) {
    throw new InvalidPhoneError();
  }
  return phone;
}

// The 05xxxxxxxx form 019 wants
export function toSmsPhone(input: string): string {
  // nationalNumber is the number without the country code or leading 0
  return `0${parseIsraeliMobile(input).nationalNumber}`;
}

// The +972xxxxxxxxx form an owner's account is stored under. One spelling
// per number, so however the owner types it, they reach the same account.
export function toAccountPhone(input: string): string {
  return parseIsraeliMobile(input).number;
}
