// "max" includes the data that tells a mobile number from a landline
import { parsePhoneNumberFromString } from "libphonenumber-js/max";

import { InvalidPhoneError } from "./errors";

// Turns any way of writing an Israeli mobile number ("052-555-1234",
// "+972 52 555 1234") into the 05xxxxxxxx form 019 wants. Throws
// InvalidPhoneError for anything that can't receive an SMS, before we pay
// for a message that would never arrive.
export function toSmsPhone(input: string): string {
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
  // nationalNumber is the number without the country code or leading 0
  return `0${phone.nationalNumber}`;
}
