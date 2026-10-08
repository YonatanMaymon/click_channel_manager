import type { Metadata } from "next";
import { Heebo } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";

import { DirectionProvider } from "@/components/ui/direction";
import { directionOf } from "@/i18n/config";
import "./globals.css";

const heebo = Heebo({
  variable: "--font-sans",
  subsets: ["hebrew", "latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Metadata");

  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();
  const dir = directionOf(locale);

  return (
    <html
      lang={locale}
      dir={dir}
      className={`${heebo.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        {/* messages={null}: don't send translations to the browser by default.
            When a client component needs some, pass only those namespaces. */}
        <NextIntlClientProvider messages={null}>
          {/* Radix menus and popovers read direction from here, not from the dir attribute */}
          <DirectionProvider dir={dir}>{children}</DirectionProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
