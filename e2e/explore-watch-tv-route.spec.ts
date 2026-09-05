import { test, expect } from "@playwright/test";
import { gotoExplore } from "./helpers/goto-explore";
import { waitExploreFeedReady } from "./helpers/wait-explore-feed-ready";

test.describe("Explore Watch TV route", () => {
  test("global chrome Watch TV navigates to /tv", async ({ page }) => {
    await gotoExplore(page);
    const watchTv = page.getByTestId("explore-watch-tv").first();
    await expect(watchTv).toBeVisible({ timeout: 15_000 });
    await watchTv.click();
    await expect(page).toHaveURL(/\/tv\/?(\?|$)/, { timeout: 15_000 });
  });

  test("reel dock Watch TV navigates to /tv", async ({ page }) => {
    await gotoExplore(page);
    await waitExploreFeedReady(page);
    const scroll = page.getByTestId("explore-feed-scroll");
    if (!(await scroll.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip(true, "No explore feed items in this environment");
    }
    const dockWatch = page.getByTestId("explore-watch-tv").last();
    await expect(dockWatch).toBeVisible({ timeout: 15_000 });
    await dockWatch.click();
    await expect(page).toHaveURL(/\/tv\/?(\?|$)/, { timeout: 15_000 });
  });
});
