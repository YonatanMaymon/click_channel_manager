import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { getAuth } from "@/lib/auth";

async function logOut() {
  "use server";
  await getAuth().api.signOut({ headers: await headers() });
  redirect("/login");
}

// For now, just enough to check login works. The real home screen (the
// calendar) comes in phase 3; the login check for every page is the next
// PLAN.md task.
export default async function Home() {
  // Reading the request first marks this page as per-visitor, so the build
  // doesn't try to render it ahead of time
  const requestHeaders = await headers();
  const session = await getAuth().api.getSession({ headers: requestHeaders });
  if (!session) redirect("/login");

  const t = await getTranslations("HomePage");

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-3 px-4 py-16">
      <h1 className="text-3xl font-bold">{t("title")}</h1>
      <p className="text-lg text-muted-foreground">{t("subtitle")}</p>
      <p dir="auto">
        {t("loggedInAs", { phone: session.user.phoneNumber ?? "" })}
      </p>
      <form action={logOut}>
        <Button type="submit" variant="outline" className="h-12 text-base">
          {t("logout")}
        </Button>
      </form>
    </main>
  );
}
