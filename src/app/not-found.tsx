import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";

export default async function NotFound() {
  const t = await getTranslations("NotFound");

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-3 px-4 py-16">
      <h1 className="text-3xl font-bold">{t("title")}</h1>
      <p className="text-lg text-muted-foreground">{t("description")}</p>
      <Button asChild size="lg" className="self-start">
        <Link href="/">{t("backHome")}</Link>
      </Button>
    </main>
  );
}
