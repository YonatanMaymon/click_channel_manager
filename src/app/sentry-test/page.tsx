// A page for checking that browser and server errors reach Sentry. Internal
// only, so it isn't translated. Doesn't exist in production.
import { notFound } from "next/navigation";

import { sentryEnvironment } from "@/lib/sentry-options";
import { SentryTestButtons } from "./sentry-test-buttons";

export default function SentryTestPage() {
  if (sentryEnvironment === "production") {
    notFound();
  }

  return (
    <main
      dir="ltr"
      className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-4 px-4 py-16"
    >
      <h1 className="text-2xl font-bold">Sentry test</h1>
      <p className="text-muted-foreground">
        Environment: {sentryEnvironment}. Each button causes one error; check
        that it shows up in Sentry.
      </p>
      <SentryTestButtons />
    </main>
  );
}
