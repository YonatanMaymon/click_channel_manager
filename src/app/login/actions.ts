"use server";

import { redirect } from "next/navigation";

import { getAuth, sendPhoneCode, verifyPhoneCode } from "@/lib/auth";

// What the login form shows: which step, the number being logged into, and
// the result of the last button pressed
export type LoginState = {
  step: "phone" | "code";
  phone: string;
  error?: "invalid_phone" | "send_failed" | "wrong_code" | "new_code_needed";
  resent?: boolean;
};

// One action for every button on the login screen; the button's
// name="intent" says which one was pressed
export async function loginStep(
  previous: LoginState,
  form: FormData,
): Promise<LoginState> {
  const intent = form.get("intent");

  if (intent === "change") return { step: "phone", phone: previous.phone };

  if (intent === "send" || intent === "resend") {
    const phone =
      intent === "send" ? String(form.get("phone") ?? "") : previous.phone;
    const sent = await sendPhoneCode(getAuth(), phone);
    if (!sent.ok) return { step: previous.step, phone, error: sent.error };
    return { step: "code", phone, resent: intent === "resend" };
  }

  // A correct code also sets the login cookie (nextCookies in src/lib/auth)
  const verified = await verifyPhoneCode(
    getAuth(),
    previous.phone,
    String(form.get("code") ?? ""),
  );
  if (!verified.ok) {
    return { step: "code", phone: previous.phone, error: verified.error };
  }
  redirect("/");
}
