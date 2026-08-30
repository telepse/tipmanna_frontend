import { test, expect } from "@playwright/test";

test.describe("tips drawer", () => {
  test("toggles event room vs this video only scopes", async ({ page }) => {
    await page.goto("/e2e/tips-drawer");
    await expect(page.getByTestId("tips-drawer")).toBeVisible();

    const eventScope = page.getByTestId("tips-drawer-scope-event");
    const videoScope = page.getByTestId("tips-drawer-scope-video");

    await expect(eventScope).toBeVisible();
    await expect(videoScope).toBeVisible();

    await expect(eventScope).toHaveAttribute("data-scope-active", "true");
    await expect(videoScope).toHaveAttribute("data-scope-active", "false");

    await videoScope.click();
    await expect(videoScope).toHaveAttribute("data-scope-active", "true");
    await expect(eventScope).toHaveAttribute("data-scope-active", "false");

    await eventScope.click();
    await expect(eventScope).toHaveAttribute("data-scope-active", "true");
    await expect(videoScope).toHaveAttribute("data-scope-active", "false");
  });
});
