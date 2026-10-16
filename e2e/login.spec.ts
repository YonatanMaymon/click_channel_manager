import { loadEnvConfig } from "@next/env";
import { expect, test } from "@playwright/test";
import { Client } from "pg";

import he from "../messages/he.json";

// The dev server's database, where the code waits until it's entered
loadEnvConfig(process.cwd());

// A real-looking Israeli mobile kept for this test; on your computer the SMS
// is only printed, never sent
const PHONE = "050-000-0001";
const ACCOUNT_PHONE = "+972500000001";

// On your computer the code is printed in the dev server's terminal, which a
// test can't read, so it reads the code Better Auth saved instead. Phone
// codes are saved as "<code>:<wrong guesses>".
async function latestCode(): Promise<string> {
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  try {
    const { rows } = await db.query(
      "select value from verifications where identifier = $1 order by created_at desc limit 1",
      [ACCOUNT_PHONE],
    );
    return String(rows[0]?.value).split(":")[0];
  } finally {
    await db.end();
  }
}

test("an owner logs in with a code by SMS, then logs out", async ({ page }) => {
  await page.goto("/login");

  await page.getByLabel(he.Login.phoneLabel).fill(PHONE);
  await page.getByRole("button", { name: he.Login.sendCode }).click();

  const codeField = page.getByLabel(he.Login.codeLabel);
  await expect(codeField).toBeVisible();
  await codeField.fill(await latestCode());
  await page.getByRole("button", { name: he.Login.verify }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText(ACCOUNT_PHONE)).toBeVisible();

  await page.getByRole("button", { name: he.HomePage.logout }).click();
  await expect(page).toHaveURL(/\/login$/);
});

test("a wrong code shows an error and stays on the code step", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel(he.Login.phoneLabel).fill(PHONE);
  await page.getByRole("button", { name: he.Login.sendCode }).click();

  const code = await latestCode();
  await page
    .getByLabel(he.Login.codeLabel)
    .fill(code === "000000" ? "111111" : "000000");
  await page.getByRole("button", { name: he.Login.verify }).click();

  // By its text: Next.js has its own, empty role="alert" element on every page
  await expect(page.getByText(he.Login.errors.wrong_code)).toBeVisible();
  await expect(page.getByLabel(he.Login.codeLabel)).toBeVisible();
});
