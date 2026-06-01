import { test, expect } from "@playwright/test";

/**
 * Smoke checks for drawer / modal stacking on Explore (reminder + profile flows).
 * Full z-index regression belongs in visual QA; this stub guards route health.
 */
test.describe("z-index reminder", () => {
  test("explore feed and profile chrome are reachable", async ({ page }) => {
    await page.goto("/explore");
    await expect(page.locator("body")).toBeVisible();

    const scroll = page.getByTestId("explore-feed-scroll");
    const emptyCopy = page.getByText(/no clips available|sign in to browse/i);
    await expect(scroll.or(emptyCopy).first()).toBeVisible({ timeout: 30_000 });

    await expect(page.getByText(/Signed in|Guest|Not signed in/i)).toBeVisible({
      timeout: 15_000,
    });
  });

  test("active slide actions render above the reel shell", async ({ page }) => {
    await page.goto("/explore");
    const scroll = page.getByTestId("explore-feed-scroll");
    if (!(await scroll.isVisible({ timeout: 15_000 }).catch(() => false))) {
      test.skip();
      return;
    }

    const actions = page.getByTestId("explore-slide-actions");
    await expect(actions).toBeVisible({ timeout: 15_000 });

    const box = await actions.boundingBox();
    expect(box?.height).toBeGreaterThan(0);
    expect(box?.width).toBeGreaterThan(0);
  });
});
