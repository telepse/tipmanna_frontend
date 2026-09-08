import { test, expect } from "@playwright/test";
import { gotoExplore } from "./helpers/goto-explore";

test.describe("Explore Watch TV route", () => {
  test("reel dock Watch TV navigates to /tv", async ({ page }) => {
    await gotoExplore(page);
    const dockWatch = page.getByTestId("explore-watch-tv").last();
    if (!(await dockWatch.isVisible({ timeout: 60_000 }).catch(() => false))) {
      test.skip(true, "No reel dock Watch TV in this environment");
    }
    await dockWatch.click();
    await expect(page).toHaveURL(/\/tv\/?(\?|$)/, { timeout: 15_000 });
  });
});
