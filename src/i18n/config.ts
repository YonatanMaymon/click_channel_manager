export const locales = ["he", "en"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "he";

// A Record forces every new locale to declare its direction.
const directions: Record<Locale, "rtl" | "ltr"> = {
  he: "rtl",
  en: "ltr",
};

export function directionOf(locale: Locale): "rtl" | "ltr" {
  return directions[locale];
}
