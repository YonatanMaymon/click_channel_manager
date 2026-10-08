import type { Locale } from "@/i18n/config";
import type en from "../messages/en.json";
import type he from "../messages/he.json";

// Makes translations type-checked: t("typo"), or a missing {placeholder}
// value, is a compile error. Kept as .ts (not .d.ts) so tsc checks this file.
declare module "next-intl" {
  interface AppConfig {
    Locale: Locale;
    Messages: typeof he;
  }
}

// he.json's keys, with any text as the value.
type MessageKeys<T> = {
  [K in keyof T]: T[K] extends string ? string : MessageKeys<T[K]>;
};
type HasAllKeys<T extends MessageKeys<typeof he>> = T;

// Fails to compile if en.json is missing a key that he.json has.
export type EnglishMessages = HasAllKeys<typeof en>;
