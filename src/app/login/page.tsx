import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";

import { getAuth } from "@/lib/auth";

import { LoginForm } from "./login-form";

export default async function LoginPage() {
  // Reading the request first marks this page as per-visitor, so the build
  // doesn't try to render it ahead of time
  const requestHeaders = await headers();
  // Already logged in: nothing to do here
  if (await getAuth().api.getSession({ headers: requestHeaders }))
    redirect("/");

  const t = await getTranslations("Login");
  const messages = await getMessages();

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-4 py-16">
      <h1 className="text-3xl font-bold">{t("title")}</h1>
      {/* Only the login texts go to the browser */}
      <NextIntlClientProvider messages={{ Login: messages.Login }}>
        <LoginForm />
      </NextIntlClientProvider>
    </main>
  );
}
