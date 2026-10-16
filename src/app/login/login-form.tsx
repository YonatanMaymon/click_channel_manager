"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";

import { loginStep, type LoginState } from "./actions";

const inputClass =
  "h-12 w-full rounded-lg border border-input bg-background px-3 text-lg outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

// Two steps on one screen: the phone number, then the code sent to it
export function LoginForm() {
  const t = useTranslations("Login");
  const [state, action, pending] = useActionState<LoginState, FormData>(
    loginStep,
    { step: "phone", phone: "" },
  );

  const message = state.error ? (
    <p role="alert" className="text-destructive">
      {t(`errors.${state.error}`)}
    </p>
  ) : state.resent ? (
    <p role="status">{t("resent")}</p>
  ) : null;

  if (state.step === "phone") {
    return (
      <form action={action} className="flex flex-col gap-4">
        <p className="text-muted-foreground">{t("phoneIntro")}</p>
        <label className="flex flex-col gap-2">
          <span className="font-medium">{t("phoneLabel")}</span>
          <input
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            required
            // Numbers read left to right, even on a Hebrew screen
            dir="ltr"
            defaultValue={state.phone}
            className={`${inputClass} text-end`}
          />
        </label>
        {message}
        <Button
          type="submit"
          name="intent"
          value="send"
          disabled={pending}
          className="h-12 text-base"
        >
          {t("sendCode")}
        </Button>
      </form>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <p className="text-muted-foreground">
        {t("codeIntro", { phone: state.phone })}
      </p>
      <label className="flex flex-col gap-2">
        <span className="font-medium">{t("codeLabel")}</span>
        <input
          // A new key per send empties the field for the new code
          key={String(state.resent)}
          name="code"
          inputMode="numeric"
          // Lets the phone offer the code from the SMS with one tap
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength={6}
          required
          autoFocus
          dir="ltr"
          className={`${inputClass} text-center tracking-[0.5em]`}
        />
      </label>
      {message}
      <Button
        type="submit"
        name="intent"
        value="verify"
        disabled={pending}
        className="h-12 text-base"
      >
        {t("verify")}
      </Button>
      <div className="flex justify-between">
        {/* formNoValidate: these don't need the code field filled in */}
        <Button
          type="submit"
          name="intent"
          value="resend"
          variant="link"
          formNoValidate
          disabled={pending}
          className="h-12"
        >
          {t("resend")}
        </Button>
        <Button
          type="submit"
          name="intent"
          value="change"
          variant="link"
          formNoValidate
          disabled={pending}
          className="h-12"
        >
          {t("changePhone")}
        </Button>
      </div>
    </form>
  );
}
