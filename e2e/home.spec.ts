import { expect, test } from "@playwright/test";

import he from "../messages/he.json";

test("a logged-out visitor lands on a Hebrew, right-to-left login page that fits a phone screen", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page).toHaveURL(/\/login$/);
  const html = page.locator("html");
  await expect(html).toHaveAttribute("lang", "he");
  await expect(html).toHaveAttribute("dir", "rtl");
  await expect(
    page.getByRole("heading", { level: 1, name: he.Login.title }),
  ).toBeVisible();

  // Nothing pokes out sideways, so the page never scrolls horizontally
  const pageWidth = await page.evaluate(
    () => document.documentElement.scrollWidth,
  );
  expect(pageWidth).toBeLessThanOrEqual(page.viewportSize()!.width);
});
