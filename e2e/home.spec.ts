import { expect, test } from "@playwright/test";

import he from "../messages/he.json";

test("home page is Hebrew, right to left, and fits a phone screen", async ({
  page,
}) => {
  await page.goto("/");

  const html = page.locator("html");
  await expect(html).toHaveAttribute("lang", "he");
  await expect(html).toHaveAttribute("dir", "rtl");
  await expect(
    page.getByRole("heading", { level: 1, name: he.HomePage.title }),
  ).toBeVisible();

  // Nothing pokes out sideways, so the page never scrolls horizontally
  const pageWidth = await page.evaluate(
    () => document.documentElement.scrollWidth,
  );
  expect(pageWidth).toBeLessThanOrEqual(page.viewportSize()!.width);
});
