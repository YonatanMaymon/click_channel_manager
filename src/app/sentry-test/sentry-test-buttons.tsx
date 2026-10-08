"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

export function SentryTestButtons() {
  const [serverResult, setServerResult] = useState<string>();

  return (
    <div className="flex flex-col gap-3">
      <Button
        onClick={() => {
          throw new Error("Sentry test error from the browser");
        }}
      >
        Throw an error in the browser
      </Button>
      <Button
        variant="outline"
        onClick={async () => {
          const response = await fetch("/api/sentry-test");
          setServerResult(`Server answered ${response.status}`);
        }}
      >
        Throw an error on the server
      </Button>
      {serverResult && <p className="text-sm">{serverResult}</p>}
    </div>
  );
}
