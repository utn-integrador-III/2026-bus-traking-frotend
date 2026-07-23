import { test, expect } from "@playwright/test";

test("home page responde con HTTP 200", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
});

test("home page renderiza el documento", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("body")).toBeVisible();
});
