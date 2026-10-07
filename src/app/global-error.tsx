"use client";

// Shown when the root layout itself crashes, which no other error page can
// catch. It replaces the whole page, so it brings its own <html> and <body>
// and can't use translations from the layout.
import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="he" dir="rtl">
      <body>
        <main style={{ padding: "4rem 1rem", textAlign: "center" }}>
          <h1>משהו השתבש</h1>
          <p>נסו לרענן את הדף.</p>
        </main>
      </body>
    </html>
  );
}
