import { getTranslations } from "next-intl/server";

export default async function Home() {
  const t = await getTranslations("HomePage");

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-3 px-4 py-16">
      <h1 className="text-3xl font-bold">{t("title")}</h1>
      <p className="text-lg text-muted-foreground">{t("subtitle")}</p>
    </main>
  );
}
