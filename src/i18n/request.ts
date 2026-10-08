import { getRequestConfig } from "next-intl/server";

import { defaultLocale } from "./config";

export default getRequestConfig(async () => {
  // Every screen is Hebrew for now. The guest widget's English option
  // (phase 6) will choose the locale here.
  const locale = defaultLocale;

  return {
    locale,
    timeZone: "Asia/Jerusalem",
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
