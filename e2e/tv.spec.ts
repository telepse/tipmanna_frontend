import { test, expect } from "@playwright/test";

test.describe("community TV", () => {
  test("tips tab opens tips feed container", async ({ page }) => {
    await page.goto("/tv");
    await expect(page.locator("body")).toBeVisible();

    const tipsNav = page.getByTestId("tv-nav-tips");
    await expect(tipsNav.first()).toBeVisible({ timeout: 60_000 });
    await tipsNav.first().click();

    await expect(page.getByTestId("tv-tips-feed").first()).toBeVisible();
  });

  test("tips feed stays visible when switching tabs", async ({ page }) => {
    await page.goto("/tv");
    await expect(page.locator("body")).toBeVisible();

    const tipsNav = page.getByTestId("tv-nav-tips");
    await expect(tipsNav.first()).toBeVisible({ timeout: 60_000 });
    await tipsNav.first().click();

    const feed = page.getByTestId("tv-tips-feed").first();
    await expect(feed).toBeVisible();

    const playlistNav = page
      .getByRole("button", { name: /tv playlist/i })
      .first();
    if (await playlistNav.isVisible().catch(() => false)) {
      await playlistNav.click();
      await tipsNav.first().click();
      await expect(feed).toBeVisible();
    }
  });
});
