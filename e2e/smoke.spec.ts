import { test, expect } from "@playwright/test";

test.describe("smoke", () => {
  test("root redirects to explore", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/explore/);
  });

  test("explore page loads", async ({ page }) => {
    await page.goto("/explore");
    await expect(page.locator("body")).toBeVisible();
  });

  test("sign in page loads", async ({ page }) => {
    await page.goto("/sign-in");
    await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();
  });
});
